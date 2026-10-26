"""Compatibility entrypoint for the maintained TypeScript Playwright suite."""
import subprocess
import sys
from pathlib import Path
sys.exit(subprocess.call(["npm", "run", "test:e2e", "--", "e2e/public.spec.ts"], cwd=Path(__file__).resolve().parents[1]))
