from __future__ import annotations

import math
from dataclasses import dataclass


def implied_probability(decimal_odds: float) -> float:
    if not math.isfinite(decimal_odds) or decimal_odds <= 1:
        raise ValueError("decimal_odds must be a finite number greater than 1")
    return 1.0 / decimal_odds


def expected_value(model_probability: float, decimal_odds: float) -> float:
    if not 0 <= model_probability <= 1:
        raise ValueError("model_probability must be between 0 and 1")
    return model_probability * decimal_odds - 1.0


def poisson_probability(goals: int, rate: float) -> float:
    if goals < 0 or rate < 0 or not math.isfinite(rate):
        raise ValueError("goals and rate must be non-negative finite values")
    return math.exp(-rate) * rate**goals / math.factorial(goals)


@dataclass(frozen=True)
class FootballProbabilities:
    home_win: float
    draw: float
    away_win: float
    over_2_5: float
    both_teams_score: float
    score_matrix: list[list[float]]


def football_poisson(home_xg: float, away_xg: float, max_goals: int = 10) -> FootballProbabilities:
    if not (0 <= home_xg <= 8 and 0 <= away_xg <= 8):
        raise ValueError("Expected goals must be between 0 and 8")
    if not 3 <= max_goals <= 15:
        raise ValueError("max_goals must be between 3 and 15")

    home = [poisson_probability(i, home_xg) for i in range(max_goals + 1)]
    away = [poisson_probability(i, away_xg) for i in range(max_goals + 1)]
    matrix = [[h * a for a in away] for h in home]
    home_win = sum(matrix[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h > a)
    draw = sum(matrix[i][i] for i in range(max_goals + 1))
    away_win = sum(matrix[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h < a)
    over_2_5 = sum(matrix[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h + a >= 3)
    btts = sum(matrix[h][a] for h in range(1, max_goals + 1) for a in range(1, max_goals + 1))
    mass = sum(sum(row) for row in matrix)

    # Normalize the truncated score grid to account for the tiny omitted tail.
    return FootballProbabilities(
        home_win=home_win / mass,
        draw=draw / mass,
        away_win=away_win / mass,
        over_2_5=over_2_5 / mass,
        both_teams_score=btts / mass,
        score_matrix=[[cell / mass for cell in row] for row in matrix],
    )
