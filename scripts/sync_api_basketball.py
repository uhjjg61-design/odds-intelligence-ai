#!/usr/bin/env python3
"""API-Basketball -> Supabase ingestion for scheduled, live and historical game scores."""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

API_BASE = "https://v1.basketball.api-sports.io"
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BASKETBALL_KEY = os.environ["API_BASKETBALL_KEY"]
LOCAL_TZ = os.getenv("SPORTS_TIMEZONE", "Africa/Casablanca")
HISTORY_DAYS = max(0, min(int(os.getenv("HISTORY_DAYS", "7")), 30))
DAYS_AHEAD = max(0, min(int(os.getenv("DAYS_AHEAD", "3")), 7))
SYNC_MODE = os.getenv("SYNC_MODE", "history").lower()
TIMEOUT = 30


def request_json(url: str, headers: dict[str, str]):
    req = Request(url, headers=headers, method="GET")
    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"HTTP {exc.code} from API-Basketball: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network request failed: {exc.reason}") from exc


def provider_get(path: str, params: dict) -> dict:
    params = {**params, "timezone": LOCAL_TZ}
    result = request_json(
        f"{API_BASE}/{path}?{urlencode(params)}",
        {"x-apisports-key": BASKETBALL_KEY, "Accept": "application/json"},
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"Unexpected API-Basketball response for {path}")
    if result.get("errors"):
        raise RuntimeError(f"API-Basketball {path} error: {result['errors']}")
    return result


def provider_get_all(path: str, params: dict, max_pages: int = 10) -> list[dict]:
    collected = []
    current, total = 0, 1
    for page in range(1, max_pages + 1):
        result = provider_get(path, {**params, "page": page})
        collected.extend(result.get("response") or [])
        paging = result.get("paging") or {}
        current = int(paging.get("current") or page)
        total = int(paging.get("total") or current)
        if current >= total:
            return collected
    if current < total:
        raise RuntimeError(f"API-Basketball pagination exceeded {max_pages} pages; narrow the date or competition filters.")
    return collected


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
    req = Request(
        f"{SUPABASE_URL}/rest/v1/{table}?{query}",
        data=None if payload is None else json.dumps(payload).encode(),
        headers=headers,
        method=method or ("POST" if payload is not None else "GET"),
    )
    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"Supabase {table} request failed ({exc.code}): {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Supabase request failed: {exc.reason}") from exc


def normalized_status(short_status: str) -> str:
    short = (short_status or "NS").upper()
    if short in {"Q1", "Q2", "Q3", "Q4", "OT", "BT", "HT", "SUSP"}:
        return "live"
    if short in {"FT", "AOT", "AWD"}:
        return "finished"
    if short in {"POST"}:
        return "postponed"
    if short in {"CANC", "ABD"}:
        return "cancelled"
    return "scheduled"


def period_scores(scores: dict) -> dict:
    result = {}
    for side in ("home", "away"):
        values = scores.get(side) or {}
        result[side] = {
            "quarter_1": values.get("quarter_1"),
            "quarter_2": values.get("quarter_2"),
            "quarter_3": values.get("quarter_3"),
            "quarter_4": values.get("quarter_4"),
            "over_time": values.get("over_time"),
        }
    return result


def sync_fixture_batch(fixtures: list[dict], label: str) -> int:
    league_rows = {}
    for item in fixtures:
        league = item.get("league") or {}
        league_id, league_name = league.get("id"), league.get("name")
        if league_id and league_name:
            league_rows[(str(league_id), league_name)] = {
                "sport_id": "basketball",
                "provider_key": str(league_id),
                "name": league_name,
                "country": (item.get("country") or {}).get("name"),
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
        game_id = item.get("id")
        starts_at = item.get("date")
        teams = item.get("teams") or {}
        home, away = teams.get("home") or {}, teams.get("away") or {}
        league = item.get("league") or {}
        status_obj = item.get("status") or {}
        scores = item.get("scores") or {}
        home_score = (scores.get("home") or {}).get("total")
        away_score = (scores.get("away") or {}).get("total")
        if not game_id or not starts_at or not home.get("name") or not away.get("name"):
            continue
        venue = item.get("venue")
        league_key = (str(league.get("id")), league.get("name"))
        rows.append({
            "provider_key": str(game_id),
            "league_id": league_map.get(league_key),
            "sport_id": "basketball",
            "home_name": home["name"],
            "away_name": away["name"],
            "starts_at": starts_at,
            "status": normalized_status(status_obj.get("short")),
            "home_score": home_score,
            "away_score": away_score,
            "period_scores": period_scores(scores),
            "venue": venue if isinstance(venue, str) else (venue or {}).get("name"),
            "round": item.get("stage") or item.get("week"),
            "raw_payload": item,
            "source_name": "api-basketball",
            "source_updated_at": datetime.now(timezone.utc).isoformat(),
        })

    if rows:
        db_request(
            "events",
            {"on_conflict": "source_name,provider_key"},
            rows,
            "resolution=merge-duplicates,return=minimal",
        )
    print(f"{label}: received {len(fixtures)} basketball games; upserted {len(rows)}")
    return len(rows)


def sync_day(day: date) -> list[dict]:
    fixtures = provider_get_all("games", {"date": day.isoformat()})
    sync_fixture_batch(fixtures, day.isoformat())
    return fixtures


def mark_source(status: str, metadata: dict, error: str | None = None):
    db_request(
        "data_sources",
        {"source_key": "eq.api-basketball"},
        {
            "status": status,
            "last_sync_at": datetime.now(timezone.utc).isoformat(),
            "last_error": error,
            "metadata": metadata,
        },
        "return=minimal",
        "PATCH",
    )


def main():
    if not all((SUPABASE_URL, SUPABASE_KEY, BASKETBALL_KEY)):
        raise RuntimeError("Missing API_BASKETBALL_KEY or Supabase server secrets")
    if SYNC_MODE not in {"live", "history", "full"}:
        raise RuntimeError("SYNC_MODE must be live, history or full")

    metadata = {"provider": "API-Basketball", "sync_mode": SYNC_MODE}
    try:
        today = datetime.now(ZoneInfo(LOCAL_TZ)).date()
        if SYNC_MODE == "live":
            metadata["today_games_upserted"] = sync_fixture_batch(
                provider_get_all("games", {"date": today.isoformat()}),
                "today/live",
            )
        elif SYNC_MODE in {"history", "full"}:
            total = 0
            for offset in range(-HISTORY_DAYS, DAYS_AHEAD + 1):
                total += len(sync_day(today + timedelta(days=offset)))
            metadata.update({
                "history_days": HISTORY_DAYS,
                "days_ahead": DAYS_AHEAD,
                "fixtures_received": total,
            })
            if SYNC_MODE == "full":
                metadata["today_games_upserted"] = sync_fixture_batch(
                    provider_get_all("games", {"date": today.isoformat()}),
                    "today/live",
                )
        mark_source("operational", metadata)
        print(f"Completed API-Basketball sync: {metadata}")
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
        print(f"BASKETBALL INGESTION FAILED: {exc}", file=sys.stderr)
        raise
