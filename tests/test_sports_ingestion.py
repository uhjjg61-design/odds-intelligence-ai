import importlib.util
import os
import pathlib
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("API_FOOTBALL_KEY", "test-provider-key")

spec = importlib.util.spec_from_file_location(
    "sync_api_football", ROOT / "scripts" / "sync_api_football.py"
)
ingestion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingestion)


class IngestionTests(unittest.TestCase):
    def test_status_mapping(self):
        self.assertEqual(ingestion.normalized_status("FT"), "finished")
        self.assertEqual(ingestion.normalized_status("1H"), "live")
        self.assertEqual(ingestion.normalized_status("PST"), "postponed")
        self.assertEqual(ingestion.normalized_status("NS"), "scheduled")

    @patch.object(ingestion, "provider_get")
    def test_provider_pagination(self, provider_get):
        provider_get.side_effect = [
            {"response": [{"fixture": {"id": 1}}], "paging": {"current": 1, "total": 2}},
            {"response": [{"fixture": {"id": 2}}], "paging": {"current": 2, "total": 2}},
        ]
        rows = ingestion.provider_get_all("fixtures", {"date": "2026-11-23"})
        self.assertEqual([row["fixture"]["id"] for row in rows], [1, 2])
        self.assertEqual(provider_get.call_count, 2)

    @patch.object(ingestion, "db_request")
    def test_fixture_upsert_includes_verified_score_fields(self, db_request):
        db_request.side_effect = [
            [{"id": "league-uuid", "provider_key": "39", "name": "Premier League"}],
            None,
        ]
        fixture = {
            "fixture": {
                "id": 12345,
                "date": "2026-11-22T16:00:00+00:00",
                "status": {"short": "FT", "elapsed": 90},
                "venue": {"name": "Stadium"},
                "referee": "Referee",
            },
            "league": {"id": 39, "name": "Premier League", "country": "England", "round": "Round 12"},
            "teams": {"home": {"name": "Home FC"}, "away": {"name": "Away FC"}},
            "goals": {"home": 2, "away": 1},
            "score": {"halftime": {"home": 1, "away": 0}},
        }
        count = ingestion.sync_fixture_batch([fixture], "test")
        self.assertEqual(count, 1)
        saved_rows = db_request.call_args_list[1].args[2]
        self.assertEqual(saved_rows[0]["home_score"], 2)
        self.assertEqual(saved_rows[0]["away_score"], 1)
        self.assertEqual(saved_rows[0]["halftime_home_score"], 1)
        self.assertEqual(saved_rows[0]["status"], "finished")


if __name__ == "__main__":
    unittest.main()
