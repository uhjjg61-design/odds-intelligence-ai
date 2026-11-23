#!/usr/bin/env python3
"""API-Football -> Supabase ingestion for historical fixtures, scores and live fixtures.

Modes:
  history: rolling historical fixtures + upcoming fixtures and a small odds sample.
  live: current live fixtures only (one API request per run).
  full: history followed by live fixtures.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

API_BASE = "https://v3.football.api-sports.io"
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
FOOTBALL_KEY = os.environ["API_FOOTBALL_KEY"]
LOCAL_TZ = os.getenv("SPORTS_TIMEZONE", "Africa/Casablanca")
HISTORY_DAYS = max(0, min(int(os.getenv("HISTORY_DAYS", "7")), 30))
DAYS_AHEAD = max(0, min(int(os.getenv("DAYS_AHEAD", "3")), 7))
ODDS_MAX_FIXTURES = max(0, min(int(os.getenv("ODDS_MAX_FIXTURES", "2")), 5))
SYNC_MODE = os.getenv("SYNC_MODE", "history").lower()
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
    params = {**params, "timezone": LOCAL_TZ}
    result = request_json(
        f"{API_BASE}/{path}?{urlencode(params)}",
        {"x-apisports-key": FOOTBALL_KEY, "Accept": "application/json"},
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"Unexpected API-Football response for {path}")
    errors = result.get("errors")
    if errors:
        raise RuntimeError(f"API-Football {path} error: {errors}")
    return result


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
    return request_json(
        f"{SUPABASE_URL}/rest/v1/{table}?{query}",
        headers,
        payload,
        method or ("POST" if payload is not None else "GET"),
    )


def normalized_status(short_status: str) -> str:
    short = (short_status or "NS").upper()
    if short in {"1H", "2H", "HT", "ET", "BT", "P", "LIVE", "SUSP", "INT"}:
        return "live"
    if short in {"FT", "AET", "PEN"}:
        return "finished"
    if short in {"PST"}:
        return "postponed"
    if short in {"CANC", "ABD", "WO"}:
        return "cancelled"
    return "scheduled"


def sync_fixture_batch(fixtures: list[dict], label: str) -> int:
    league_rows = {}
    for item in fixtures:
        league = item.get("league") or {}
        league_id, league_name = league.get("id"), league.get("name")
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
        score = item.get("score") or {}
        goals = item.get("goals") or {}
        status_obj = fixture.get("status") or {}
        fixture_id, starts_at = fixture.get("id"), fixture.get("date")
        if not fixture_id or not starts_at or not home.get("name") or not away.get("name"):
            continue

        league_key = (str(league.get("id")), league.get("name"))
        venue = fixture.get("venue") or {}
        rows.append({
            "provider_key": str(fixture_id),
            "league_id": league_map.get(league_key),
            "sport_id": "football",
            "home_name": home["name"],
            "away_name": away["name"],
            "starts_at": starts_at,
            "status": normalized_status(status_obj.get("short")),
            "home_score": goals.get("home"),
            "away_score": goals.get("away"),
            "halftime_home_score": (score.get("halftime") or {}).get("home"),
            "halftime_away_score": (score.get("halftime") or {}).get("away"),
            "elapsed_minutes": status_obj.get("elapsed"),
            "venue": venue.get("name"),
            "referee": fixture.get("referee"),
            "round": league.get("round"),
            "raw_payload": item,
            "source_name": "api-football",
            "source_updated_at": datetime.now(timezone.utc).isoformat(),
        })

    if rows:
        db_request(
            "events",
            {"on_conflict": "source_name,provider_key"},
            rows,
            "resolution=merge-duplicates,return=minimal",
        )
    print(f"{label}: received {len(fixtures)} fixtures; upserted {len(rows)}")
    return len(rows)


def sync_live() -> int:
    result = provider_get("fixtures", {"live": "all"})
    fixtures = result.get("response") or []
    return sync_fixture_batch(fixtures, "live")


def sync_day(day: date) -> list[dict]:
    result = provider_get("fixtures", {"date": day.isoformat()})
    fixtures = result.get("response") or []
    sync_fixture_batch(fixtures, day.isoformat())
    return fixtures


def sync_odds(fixture_id: int, event_id: str) -> int:
    result = provider_get("odds", {"fixture": fixture_id})
    markets, odds = {}, {}
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


def mark_source(status: str, metadata: dict, error: str | None = None):
    payload = {
        "status": status,
        "last_sync_at": datetime.now(timezone.utc).isoformat(),
        "last_error": error,
        "metadata": metadata,
    }
    db_request(
        "data_sources",
        {"source_key": "eq.api-football"},
        payload,
        "return=minimal",
        "PATCH",
    )


def sync_history() -> tuple[int, int]:
    today = datetime.now(ZoneInfo(LOCAL_TZ)).date()
    fixtures_by_id = {}
    for offset in range(-HISTORY_DAYS, DAYS_AHEAD + 1):
        day = today + timedelta(days=offset)
        for item in sync_day(day):
            fixture_id = (item.get("fixture") or {}).get("id")
            if fixture_id:
                fixtures_by_id[int(fixture_id)] = item

    odds_count = 0
    now = datetime.now(timezone.utc)
    upcoming = []
    for fixture_id, item in fixtures_by_id.items():
        fixture = item.get("fixture") or {}
        try:
            starts = datetime.fromisoformat(fixture.get("date", "").replace("Z", "+00:00"))
        except ValueError:
            continue
        short = ((fixture.get("status") or {}).get("short") or "NS").upper()
        if starts >= now and short in {"NS", "TBD"}:
            upcoming.append((starts, fixture_id))
    upcoming.sort()

    for _, fixture_id in upcoming[:ODDS_MAX_FIXTURES]:
        rows = db_request(
            "events",
            {
                "select": "id",
                "source_name": "eq.api-football",
                "provider_key": f"eq.{fixture_id}",
                "limit": "1",
            },
        )
        if rows:
            try:
                odds_count += sync_odds(fixture_id, rows[0]["id"])
            except RuntimeError as exc:
                print(f"Odds sync skipped for fixture {fixture_id}: {exc}")

    return len(fixtures_by_id), odds_count


def main():
    if not all((SUPABASE_URL, SUPABASE_KEY, FOOTBALL_KEY)):
        raise RuntimeError("Missing required provider or Supabase secrets")
    if SYNC_MODE not in {"live", "history", "full"}:
        raise RuntimeError("SYNC_MODE must be live, history or full")

    metadata = {"provider": "API-Football", "sync_mode": SYNC_MODE}
    try:
        if SYNC_MODE in {"history", "full"}:
            fixtures_count, odds_count = sync_history()
            metadata.update({
                "history_days": HISTORY_DAYS,
                "days_ahead": DAYS_AHEAD,
                "fixtures_received": fixtures_count,
                "odds_snapshots_saved": odds_count,
            })
        if SYNC_MODE in {"live", "full"}:
            metadata["live_fixtures_upserted"] = sync_live()
        mark_source("operational", metadata)
        print(f"Completed API-Football sync: {metadata}")
    except Exception as exc:
        try:
            mark_source("degraded", metadata, str(exc)[:1000])
        except Exception:
            pass
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"INGESTION FAILED: {exc}", file=sys.stderr)
        raise
