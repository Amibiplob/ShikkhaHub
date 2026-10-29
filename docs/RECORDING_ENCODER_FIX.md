# Live Class recording encoder startup — 29 October 2026

The exact confirmation → 00:00 → encoder timeout was reproduced before the fix in Chrome 156.0.8078.47, with the device enumeration empty and every `getUserMedia()` call rejected by the test fixture. The execution environment reports Linux Mint 22.3. This is browser automation with deterministic device/media fixtures, not confirmation of physical camera, microphone or native screen-picker behavior on the user's hardware.

The pre-change event log contains three canvas paint operations, all before `captureStream(15)`, and **no subsequent paints**. The audio graph advances 10.005 seconds. Only timeout cleanup causes the recorder's `start`, final data and `stop` events to arrive, with the recorder already inactive. The exact alert is `Recording encoder startup timed out. Return to the classroom and retry. Saved chunks remain on this device.` Evidence: `artifacts/encoder-start/reproduction/evidence.json`, `reproduction/encoder-startup-device-fre-91ca7-rtup-and-advances-its-timer/startup.png`, and the trace beside that screenshot.

The startup sequence had a circular dependency: drawing started only after awaiting `onstart`, while Chrome needed captured video frames to initialize the encoder. The timer's timestamp was also assigned after that awaited event, leaving the UI at 00:00. The implementation did not wait for the first nonempty chunk. Increasing the ten-second startup deadline would not repair this dependency.

The repair captures the canvas before drawing, starts the composition loop during startup, and decodes an input frame before constructing the recorder. The active transition requires that frame validation, a running audio graph, a recording encoder and live output tracks. Chunk delivery remains independent: a real encoder configured without a timeslice starts, advances the timer, and emits all its data only on Stop.

A zero-valued Web Audio source provides silence when participants have no media. Participant consent, muted-source filtering, remote media and screen composition continue to use the existing stable output tracks. The format selector checks support and falls back if a supported format rejects construction with `NotSupportedError`; it preserves other errors. Audio resume, encoder startup, chunk storage, draft recovery and finalization have bounded waits. Encoder errors and cancellation reject startup promptly. A missing stop event also settles with an error. No retry loop or duplicate active encoder is introduced.

Elapsed time comes from timestamps and refreshes immediately on tab return. The stop timestamp freezes duration while persistence and decoding finish. Finalization requires nonempty journal bytes and successful browser decoding of the first video frame before setting `complete=true`. Failed recordings retain their chunks and remain incomplete. Private uploads, metadata authorization, storage policies and participant notices are unchanged by this commit.

Files in the recording-only commit:

| File | Purpose |
| --- | --- |
| `src/features/live-classes/MeetingRecorder.ts` | Frame scheduling, audio initialization, valid state transitions, error settlement, elapsed time and final decode validation |
| `src/features/live-classes/recording-encoder.ts` | Output-track validation, MIME fallback, browser frame decoding and bounded promises |
| `src/features/live-classes/MeetingRecorder.startup.test.ts` | Ten lifecycle, cancellation, error, duration and recovery tests |
| `src/features/live-classes/recording-encoder.test.ts` | Seven format, permission and invalid-track tests |
| `e2e/encoder-startup.spec.ts` | Five real Chrome startup, placeholder, screen-sharing, deferred-chunk and retry scenarios |
| `e2e/encoder-background.spec.ts` | Device-free native hidden/visible transition, audio suspension/resume, timer and playback |
| `e2e/native-chrome.ts` | Explicit autoplay-policy option; new tests disable the autoplay override and fake hardware |
| `e2e/recorded-media.ts` | Count actual decoded video frames with ffprobe; keep one-second color samples separate |
| `docs/RECORDING_ENCODER_FIX.md` | Reproduction, implementation, evidence and verification boundaries |

The existing uncommitted UX/status, upload helper/panel, capture-health, migration-test and package changes are excluded. Two existing untracked tests retain small compatibility updates in the working tree: realistic live-track/encoder fakes in `MeetingRecorder.test.ts` and an explicit expected-400 annotation in `recording-start.spec.ts`; their assertions remain intact and those files are not included in this commit. The shared recorder file is staged separately from its existing capture-health overlay. The native Chrome helper's existing default-policy edit is also left unstaged. A separate checkout of HEAD plus only the proposed recording changes verifies that the commit works without those other edits. That checkout uses its own Vite cache and permits its shared local dependency path; these harness settings are not application changes.

The final isolated recording implementation passed 17 targeted unit tests, TypeScript, ESLint and all six headed Chrome scenarios (zero failed, skipped or flaky cases). The headed background recording contains 74 decoded video frames over 11.863 seconds, with a 7.508-second native hidden-tab interval, one encoder start/stop pair and no encoder errors. All seven final isolated WebM artifacts fully decode with FFmpeg without errors. Evidence is under `artifacts/encoder-start/isolated-final/`, `isolated-final-results.json`, `isolated-final-evidence/` and `isolated-decoded-files.json`.

Final `E2E_PORT=18082 npm run verify` completed successfully, including repository secret scanning, 6 security tests, 3 build-environment tests, TypeScript, ESLint, 148 unit/component tests in 28 files, 53 local SQL tests, the production build and **112/112 Chrome browser tests**. The browser run took 19.5 minutes with zero skipped, unexpected or flaky cases. The previously timed-out unchanged live-session case passed in 23.1 seconds. `npm audit` reports zero vulnerabilities across production and development dependencies; `git diff --check` passes. There were no dependency changes in this fix.

Final log: `artifacts/encoder-start/verify.log`; browser JSON: `final-results.json`; decoded-media/timing report: `final-decoded-files.json`; extracted media/lifecycle evidence: `final-evidence/`. The final full run produced 12 WebM artifacts; every audio/video stream fully decodes without errors. The zero-device host/remote-media/native-tab-switch scenario and placeholder-only silent recording both passed. Combined with nine earlier targeted and seven final isolated artifacts, 28 encoded files were checked by FFmpeg. These are local browser and fixture results, not hosted-provider acceptance.

| Requested scenario | Browser/media evidence and limit |
| --- | --- |
| No microphone/camera; no local tracks; placeholder video | Empty-device fixture, zero `getUserMedia()` calls, real canvas encoder, silent Opus and decoded placeholder video |
| A: start without sharing | Device-free startup and complete-meeting tests |
| B: start while already sharing | Two completed device-free recordings with a generated presentation track |
| C/D/E: start, stop and restart sharing during capture | Complete-meeting test and repeated device-free presentation test; stable output tracks, decoded orange presentation region and 1320 Hz tone |
| F: remote audio/video | Real local WebRTC connections with deterministic teacher/student media; decoded video regions and 440/880 Hz tones; consent filtering retained |
| Repeated recording | Two distinct native encoders, stopped between sessions; both finalized files decoded |
| Tab switches and return | Native hidden/visible transitions, same encoder retained, elapsed timestamp catches up; short controlled intervals only |
| Permission denial | Existing camera/microphone and screen-denial browser cases, plus denied private recording notice; no consent bypass |
| MediaRecorder failure | Error event injected into a real native recorder; draft retained and another recording allowed. Unit tests cover absent start/stop events and immediate startup error rejection |
| AudioContext suspension | Real suspension before startup with forced failed resume, then successful retry; real suspension while hidden followed by actual resume on refocus |
| Unsupported MIME | Forced unsupported-format reports produce an accurate failure and successful retry; real generic WebM encoding works. Constructor fallback/security-error behavior also has unit tests |
| Delayed chunks | Real encoder starts without a timeslice, timer advances with zero nonempty chunks, Stop delivers playable media |
| Upload failure/retry and recovery | IndexedDB reload/download, intercepted 403 upload, retained local draft, retry with one saved metadata row; no hosted upload claim |
| Playback | Visible Chromium playback waits for an advancing decoded frame; ffprobe counts actual decoded frames; FFmpeg fully decodes audio/video |

An initial 25-case targeted run passed 24 cases; the unchanged live-session end test exceeded its existing 30-second budget. During validation development, concurrent browser runs also exposed an overly short test wait and a misleading one-second sample count used as a frame count. Browser runs were made serial, waits now cover bounded startup plus elapsed capture, and frame assertions retain their thresholds while using actual decoded frame counts. A subsequent broad run was interrupted after report edits triggered Tailwind/Vite full-page reloads during recording: the trace shows a beforeunload event, fresh Vite connections and a return to prejoin, with one reload matching the report file modification time. This was development-server interference; final verification freezes workspace files until the server stops. Intermediate failed/interrupted reports remain under `artifacts/encoder-start/`; the final runs are identified explicitly above and below.

Recorded-media evidence already includes VP8 1280×720 plus Opus, silent device-free output, remote teacher/student video regions, 440/880 Hz participant audio and 1320 Hz presentation audio. The final complete-meeting artifact lasts 35.618 seconds, contains 314 decoded video frames and has a maximum audio packet gap of 0.148 seconds. Its teacher/student/presentation tone amplitudes exceed 0.117, and all three video regions are present. Across the 12 final artifacts, ffprobe found no backward audio or video packet timestamps. Nine targeted WebM artifacts fully decode with FFmpeg using passthrough timestamps and `-xerror -err_detect explode`, without decoder errors. These short tests do not establish gapless capture, lip synchronization, crash-proof recovery or long-duration stability.

Local recovery/upload checks exercise IndexedDB reload, a denied storage upload, retained draft download, successful retry and exactly one metadata row. HTTP/Auth/Realtime/Storage responses are intercepted fixtures. SQL authorization checks execute locally. No hosted migration, Supabase Storage/Realtime session or production upload has been verified or modified.

Hosted use still requires an authorized application release and administrator verification of the existing `202610280001_live_meeting_state.sql` dependency. Its hosted deployment status is unknown. This fix adds no migration and changes no environment files. Safari, Firefox, iOS, physical devices, native system-audio capture, long recordings and cross-network TURN behavior remain unverified. Background browsers may throttle capture; a running timer alone is not proof of uninterrupted encoded media.

API references: [W3C canvas capture and painting](https://www.w3.org/TR/mediacapture-fromelement/#html-canvas-element-media-capture-extensions), [W3C MediaRecorder start, events and data handling](https://www.w3.org/TR/mediastream-recording/). The reproduced cause above is based on this checkout's Chrome event trace and corrected encoded output.
