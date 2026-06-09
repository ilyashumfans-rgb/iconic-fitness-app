---
name: ffmpeg parallel encode / filesystem sync flakiness
description: Background-job file writes (ffmpeg with &/wait) can intermittently not persist or appear inconsistently in ls/glob in this container.
---

Running several ffmpeg encodes as background jobs (`cmd &` ... `wait`) into the same dir produced inconsistent results: jobs printed "done" but `ls`/glob and even `find` showed different subsets of the output files on successive checks, and some outputs (suraj/albha) never actually persisted while one (rikitha) did.

**Why:** appears to be an overlay/filesystem consistency issue for files written by parallel background subshells in the Replit container — not an ffmpeg failure (the encodes really ran).

**How to apply:** For media transcoding (or any batch of generated files that must persist), run the commands **serially**, call `sync` after each write, and verify each file individually with `stat -c%s`/`find` immediately afterward rather than trusting a single glob `ls`. Re-encode any missing file before moving on. Avoid `&`+`wait` fan-out for file-producing commands here.
