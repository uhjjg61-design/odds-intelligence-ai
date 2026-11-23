#!/usr/bin/env python3
"""Scheduled API-Football -> Supabase ingestion. No predictions are fabricated."""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://v3.football.api-sports.io"
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
FOOTBALL_KEY = os.environ["API_FOOTBALL_KEY"]
DAYS_AHEAD = max(0, min(int(os.getenv("DAYS_AHEAD", "2")), 7))
ODDS_MAX_FIXTURES = max(0, min(int(os.getenv("ODDS_MAX_FIXTURES", "3")), 10))
TIMEOUT = 30


def request_json(url: str, headers: dict[str, str], payload=None, method=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"HTTP {exc.code} from upstream: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network request failed: {exc.reason}") from exc


def provider_get(path: str, params: dict):
    return request_json(
        f"{API_BASE}/{path}?{urlencode(params)}",
        {"x-apisports-key": FOOTBALL_KEY, "Accept": "application/json"},
    )


def db_request(table: str, params: dict, payload=None, prefer="return=representation", method=None):
    query = urlencode(params, doseq=True)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = prefer
    return request_json(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers, payload, method or ("POST" if payload is not None else "GET"))


def sync_fixtures(day: date):
    result = provider_get("fixtures", {"date": day.isoformat()})
    if result.get("errors"):
        raise RuntimeError(f"API-Football fixtures error: {result['errors']}")
    fixtures = result.get("response") or []
    league_rows = {}
    for item in fixtures:
        league = item.get("league") or {}
        league_id = league.get("id")
        league_name = league.get("name")
        if league_id and league_name:
            league_rows[(str(league_id), league_name)] = {
                "sport_id": "football",
                "provider_key": str(league_id),
                "name": league_name,
                "country": league.get("country"),
                "active": True,
            }
    league_map = {}
    for row in league_rows.values():
        saved = db_request(
            "leagues",
            {"on_conflict": "sport_id,name"},
            [row],
            "resolution=merge-duplicates,return=representation",
        )
        if saved:
            league_map[(saved[0].get("provider_key"), saved[0]["name"])] = saved[0]["id"]
    rows = []
    for item in fixtures:
        fixture = item.get("fixture") or {}
        teams = item.get("teams") or {}
        home, away = teams.get("home") or {}, teams.get("away") or {}
        league = item.get("league") or {}
        fixture_id = fixture.get("id")
        starts_at = fixture.get("date")
        if not fixture_id or not starts_at or not home.get("name") or not away.get("name"):
            continue
        short = ((fixture.get("status") or {}).get("short") or "NS").upper()
        status = (
            "live" if short in {"1H", "2H", "HT", "ET", "BT", "P", "LIVE"}
            else "finished" if short in {"FT", "AET", "PEN"}
            else "postponed" if short == "PST"
            else "cancelled" if short in {"CANC", "ABD", "WO"}
            else "scheduled"
        )
        lk = (str(league.get("id")), league.get("name"))
        rows.append({
            "provider_key": str(fixture_id),
            "league_id": league_map.get(lk),
            "sport_id": "football",
            "home_name": home["name"],
            "away_name": away["name"],
            "starts_at": starts_at,
            "status": status,
            "source_name": "api-football",
            "source_updated_at": datetime.now(timezone.utc).isoformat(),
        })
    if rows:
        db_request("events", {"on_conflict": "source_name,provider_key"}, rows, "resolution=merge-duplicates,return=minimal")
    print(f"{day}: received {len(fixtures)} fixtures; upserted {len(rows)}")
    return fixtures


def sync_odds(fixture_id: int, event_id: str):
    result = provider_get("odds", {"fixture": fixture_id})
    if result.get("errors"):
        print(f"Odds unavailable for fixture {fixture_id}: {result['errors']}")
        return 0
    markets = {}
    odds = {}
    for record in result.get("response") or []:
        for bookmaker in record.get("bookmakers") or []:
            bookmaker_id = bookmaker.get("id", "unknown")
            bookmaker_name = bookmaker.get("name") or f"Bookmaker {bookmaker_id}"
            for bet in bookmaker.get("bets") or []:
                market_type = f"{bookmaker_name} | {bet.get('name') or bet.get('id')}"
                for value in bet.get("values") or []:
                    selection = str(value.get("value") or "").strip()
                    try:
                        odd = float(value.get("odd"))
                    except (TypeError, ValueError):
                        continue
                    if not selection or odd <= 1:
                        continue
                    key = (market_type, selection)
                    markets[key] = {
                        "event_id": event_id,
                        "market_type": market_type,
                        "selection": selection,
                        "line": 0,
                        "active": True,
                    }
                    odds[key] = (f"api-football:{bookmaker_id}", odd)
    if not markets:
        return 0
    saved = db_request(
        "markets",
        {"on_conflict": "event_id,market_type,selection,line"},
        list(markets.values()),
        "resolution=merge-duplicates,return=representation",
    )
    ids = {(row["market_type"], row["selection"]): row["id"] for row in (saved or [])}
    captured = datetime.now(timezone.utc).isoformat()
    snapshots = []
    for key, (source, price) in odds.items():
        if key in ids:
            snapshots.append({
                "market_id": ids[key],
                "source_name": source,
                "decimal_odds": price,
                "captured_at": captured,
                "is_live": False,
                "raw_payload": {"provider": "API-Football", "fixture_id": fixture_id},
            })
    if snapshots:
        db_request("odds_snapshots", {}, snapshots, "return=minimal")
    print(f"Fixture {fixture_id}: stored {len(snapshots)} odds snapshots")
    return len(snapshots)


def main():
    if not all((SUPABASE_URL, SUPABASE_KEY, FOOTBALL_KEY)):
        raise RuntimeError("Missing required GitHub Actions secrets")
    all_fixtures = []
    for offset in range(DAYS_AHEAD + 1):
        day = date.today() + timedelta(days=offset)
        all_fixtures.extend(sync_fixtures(day))
    odds_count = 0
    if ODDS_MAX_FIXTURES:
        now = datetime.now(timezone.utc)
        upcoming = []
        seen = set()
        for item in all_fixtures:
            fixture = item.get("fixture") or {}
            fid = fixture.get("id")
            try:
                starts = datetime.fromisoformat(fixture.get("date", "").replace("Z", "+00:00"))
            except ValueError:
                continue
            if fid and fid not in seen and starts >= now and ((fixture.get("status") or {}).get("short") or "NS") in {"NS", "TBD"}:
                seen.add(fid)
                upcoming.append((starts, int(fid)))
        upcoming.sort()
        for _, fixture_id in upcoming[:ODDS_MAX_FIXTURES]:
            rows = db_request("events", {
                "select": "id", "source_name": "eq.api-football",
                "provider_key": f"eq.{fixture_id}", "limit": "1",
            })
            if rows:
                try:
                    odds_count += sync_odds(fixture_id, rows[0]["id"])
                except RuntimeError as exc:
                    print(f"Odds sync skipped for fixture {fixture_id}: {exc}")
    db_request("data_sources", {"source_key": "eq.api-football"}, {
        "status": "operational",
        "last_sync_at": datetime.now(timezone.utc).isoformat(),
        "last_error": None,
        "metadata": {
            "provider": "API-Football",
            "last_fixture_sync_at": datetime.now(timezone.utc).isoformat(),
            "fixtures_received": len(all_fixtures),
            "odds_snapshots_saved": odds_count,
        },
    }, "return=minimal", "PATCH")
    print(f"Completed: {len(all_fixtures)} fixture records; {odds_count} odds snapshots.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"INGESTION FAILED: {exc}", file=sys.stderr)
        try:
            db_request("data_sources", {"source_key": "eq.api-football"}, {
                "status": "degraded", "last_error": str(exc)[:1000],
            }, "return=minimal", "PATCH")
        except Exception:
            pass
        raise
