import importlib.util
import os
import pathlib
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("API_BASKETBALL_KEY", "test-basketball-key")

spec = importlib.util.spec_from_file_location(
    "sync_api_basketball", ROOT / "scripts" / "sync_api_basketball.py"
)
ingestion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingestion)


class BasketballIngestionTests(unittest.TestCase):
    def test_status_mapping(self):
        self.assertEqual(ingestion.normalized_status("Q2"), "live")
        self.assertEqual(ingestion.normalized_status("FT"), "finished")
        self.assertEqual(ingestion.normalized_status("POST"), "postponed")
        self.assertEqual(ingestion.normalized_status("NS"), "scheduled")

    def test_period_scores(self):
        result = ingestion.period_scores({
            "home": {"quarter_1": 20, "quarter_2": 22, "quarter_3": 18, "quarter_4": 25, "over_time": 4, "total": 89},
            "away": {"quarter_1": 19, "quarter_2": 20, "quarter_3": 21, "quarter_4": 22, "over_time": 2, "total": 84},
        })
        self.assertEqual(result["home"]["quarter_1"], 20)
        self.assertEqual(result["away"]["over_time"], 2)

    @patch.object(ingestion, "db_request")
    def test_fixture_upsert_includes_total_and_period_scores(self, db_request):
        db_request.side_effect = [
            [{"id": "league-uuid", "provider_key": "12", "name": "NBA"}],
            None,
        ]
        game = {
            "id": 391053,
            "date": "2026-11-22T00:30:00+00:00",
            "status": {"short": "FT", "long": "Game Finished", "timer": None},
            "league": {"id": 12, "name": "NBA", "season": "2026-2027"},
            "country": {"name": "USA"},
            "teams": {"home": {"name": "Home"}, "away": {"name": "Away"}},
            "scores": {
                "home": {"quarter_1": 20, "quarter_2": 22, "quarter_3": 18, "quarter_4": 25, "over_time": 4, "total": 89},
                "away": {"quarter_1": 19, "quarter_2": 20, "quarter_3": 21, "quarter_4": 22, "over_time": 2, "total": 84},
            },
        }
        self.assertEqual(ingestion.sync_fixture_batch([game], "test"), 1)
        row = db_request.call_args_list[1].args[2][0]
        self.assertEqual((row["home_score"], row["away_score"]), (89, 84))
        self.assertEqual(row["period_scores"]["home"]["quarter_4"], 25)
        self.assertEqual(row["status"], "finished")


if __name__ == "__main__":
    unittest.main()
