"""Reuse the 23 independent review variations against this review's scratch tree."""
from pathlib import Path
source = Path(__file__).resolve().parent.parent / 'round3/delta_variations.py'
exec(compile(source.read_bytes(), str(source), 'exec'), globals())
