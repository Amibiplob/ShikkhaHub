# Live classroom engineering and acceptance

Implementation 28 October; final verification 29 October 2026 (Asia/Dhaka). Local implementation and verification; **not deployed or approved for production**. The previous hosted staging subset predates this change. The new migration has not been applied to any hosted backend.

## Confirmed tab-return failure

Baseline: `1ef1b2d`. A separate checkout in `/tmp` ran the original classroom in real headed Google Chrome, connected through CDP without Playwright's default focus/visibility overrides. The test asserts a native `hidden` state, waits five seconds, brings the class back and asserts `visible`. Returning causes the original End/Stop recording controls to disappear. Its lifecycle attachment shows live audio/video while hidden, followed by `dataavailable`/`stop` with both tracks ended on return. This is a meeting teardown, not a demonstrated React exception or MediaRecorder encoder crash.

`AuthContext.applySession` previously set `loading=true`, emptied roles and removed the profile for every auth event. Supabase can re-emit `SIGNED_IN` when the same session is recovered on tab focus. `ProtectedRoute` then renders its loader, unmounts the live route and runs the hook's destructive cleanup. The new same-user regression test fails against the original provider because its protected media child unmounts. It passes after the repair. Opening another authenticated app tab also reproduced teardown before repair.

The provider now refreshes the session, roles and profile in place for the same user. Different identities and logout still clear privileges immediately. Generation guards ignore obsolete responses; failed role revalidation clears roles. Database authorization remains authoritative. This does not cache administrator privileges indefinitely or bypass server checks.

Fresh two-party reproduction: `artifacts/classroom-completion/original-final/` (native hidden interval, both tracks ended on refocus, End control missing). Evidence: ignored `artifacts/classroom-baseline-native/` holds the baseline failing report, actual visibility/track/chunk attachment, screenshot and trace. Earlier diagnostic failures are retained separately. Playwright's ordinary contexts force page visibility; a second CDP session cannot undo the original session's emulation. `e2e/native-chrome.ts` starts a disposable Chrome profile and connects its default context with `noDefaults: true` so the recording test proves native visibility transitions. No JavaScript visibility-property override is used.

Reference: [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) documents repeated `SIGNED_IN` notifications, including tab refocus.

## Media and classroom behavior

The route queries class metadata through existing RLS and composes `LiveClassroom`. The lobby offers camera/audio, audio-only, host presentation, start-muted, student camera-off and participant media-consent choices. A student without consent can attend as a listener without device capture. Enabling student media requires consent in the lobby; leave and rejoin to change that choice. Hosts confirm their own recording consent separately when starting each recording.

The interface uses ShikkhaHub branding, the existing design tokens, English/Bangla controls, status/time/count/recording indicators, a responsive participant grid, a presentation-priority stage, real audio-activity borders, participant/chat/device/recording panels and keyboard-accessible controls. At narrow widths panels overlay the stage and keep the toolbar accessible; controls wrap without horizontal document overflow.

Microphone and camera use separate capture requests. Mute updates `MediaStreamTrack.enabled`. Camera off keeps the connection and microphone alive. Re-enabling a missing/ended camera acquires a track and replaces the sender. Device selectors use exact device IDs; denied, missing, busy and ended devices get recovery messages. Capture defaults to 640×360, up to 24 fps. Camera failure can fall back to an explicitly requested microphone without silently requesting screen access.

Chrome regressions also confirmed two lifecycle defects during final review. A delayed recording-notice response could create a recorder after the class ended; a session-generation check now cancels that continuation. Switching a muted microphone could pass an enabled replacement to `RTCRtpSender` before applying mute; the replacement is now disabled before it reaches any sender. New input streams have a new identity so audio meters and video elements reconnect to the selected tracks. Both browser regressions failed before the repairs and passed afterward.

The host initiates all offers, preserving existing signaling authority. Audio and camera use two bidirectional transceivers. Two additional transceivers carry host presentation video/audio. Six reserved audio/video slot pairs relay other consenting students to each receiver. A student's own media is excluded from its return slots, avoiding duplicate audio/self-echo. Null/disabled tracks and `replaceTrack` handle input changes without rebuilding peer connections. Roster updates rebuild receiver streams from fixed transceivers, including reused slots after a participant leaves. Waiting/reconnecting viewers retry discovery on their existing subscription; the host deduplicates offers and re-announces the current roster and recording state after Realtime reconnects.

**Capacity is intentionally capped at one teacher and six students.** This is a small classroom architecture, not an SFU or unlimited broadcast service. Host upload, decoding and relay work grow with participants. Seven is a software admission limit, not a measured seven-device performance guarantee. Real hardware/load acceptance remains required.

Only the teacher can present under the existing host-only offer rules. Presentation is always user-initiated using `getDisplayMedia`; no production permission bypass exists. Camera remains independently controllable while presenting. Browser-driven capture termination clears only presentation tracks, retains the microphone/camera/meeting, and updates peers. A later participant receives the current presentation through its reserved sender. Capture audio is requested, but only audio tracks actually supplied by the browser enter forwarding or recording. Do not infer system/tab-audio support from an empty audio-track list.

Private subscriptions are owned once per joined session. Incoming async operations are caught, early ICE is queued, candidates are bounded, repeated join requests do not create duplicate peers, stale closed peers can be replaced, and disconnects get a recovery interval instead of immediate teardown. Realtime re-subscription announces/rejoins; failed peers can reconnect through a new host offer. Recordings continue with the currently available media during a temporary interruption. Network recovery timing, hostile networks, TURN and provider delivery still need hosted acceptance.

## Recording architecture

`MeetingRecorder` owns an explicit idle → starting → recording → stopping → processing → completed/failed lifecycle. A synchronous start guard rejects duplicate attempts. Recording refuses to start when the private participant notice RPC fails. Notices appear for current participants and late joiners; stops are announced through host-authenticated meeting state.

The recorder receives **two stable output tracks** for its lifetime:

- A 1280×720 canvas stream, requested at 15 fps. Without presentation it lays out consenting participants, with names and camera-off placeholders. With presentation it draws the aspect-preserved screen and a participant column. Source joins/leaves and camera/presentation changes update the composition rather than replacing recorder tracks.
- One Web Audio destination. It mixes local microphone, authorized remote microphones and browser-supplied presentation audio. Inputs are deduplicated by track ID, removed when absent/muted and routed through a dynamics compressor to reduce clipping. The mixer is not connected to speakers and does not capture page playback.

VP8/Opus WebM is preferred; supported WebM or MP4 is negotiated through `isTypeSupported`. Actual MIME type determines upload content type and file extension. No pause/resume feature is advertised.

Recording time derives from elapsed wall time, not chunk counts or timer ticks. Rendering resumes/rechecks on visibility return without stopping media or unsubscribing. A browser may throttle timers or suspend hidden video frames; **continuous hidden video is not guaranteed**. Audio can continue when the browser permits. Mobile screen lock, OS suspension, sleep and resource exhaustion can interrupt capture. [MDN's chunk-event documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event) explains that timeslices are not exact and browser suspension can delay chunks.

The default profile has a **30-minute or 128-MiB soft stop**, whichever is observed first. Hosted project/bucket upload limits may be lower; a rejected upload retains the local draft. The last browser-delivered chunk can exceed the byte threshold; a throttled timer can observe the time limit late. There is no unlimited memory or duration claim. React state updates once per elapsed second rather than on every composition frame.

## Persistence, retry, privacy and retention

One-second chunks are queued into an origin-local IndexedDB journal, rather than retained in an ever-growing JavaScript array. Finalization waits for the last chunk and pending journal writes before exposing a Blob. Completed drafts survive a normal reload. Interrupted drafts can be downloaded as partial data; successful playback is not guaranteed. Browser quota/write/encoder failures surface a failed state and retain previously written chunks. The complete Blob is assembled at finalization/download/upload, so bounded finalization memory is still needed. This is not a resumable encoder or a resumable server upload.

Closing/reloading during recording gets a native unload warning where supported. A normal unmount attempts finalization and cleans up owned media, peers, channel, timers, detached video elements and audio contexts. **Browser termination, computer shutdown, cleared site data, private browsing and eviction are not guaranteed recoverable.** No unattended/server recorder exists.

The recordings panel can download a completed draft, retry a failed upload or explicitly discard local data. A draft's UUID is reused as both storage basename and metadata ID. Private uploads do not overwrite; duplicate-object/metadata retry paths do not create a new recording. The local journal is deleted only after metadata is successfully saved or already exists. A failed upload keeps the draft. Reloading shows saved history through existing course-authorized queries and playback signs URLs for short periods; metadata stores object paths, not public URLs.

Local IndexedDB is device/origin storage, **not encrypted per-user storage**. The UI filters by user/class, but users sharing a browser profile should save/discard drafts and clear site data appropriately. An authenticated user changing accounts does not make origin storage an operating-system isolation boundary.

Hosted files remain in the existing private `class-recordings` bucket. Existing RLS restricts upload/deletion to the class owner and reads to authorized course participants; enrollment/access revocation is enforced on subsequent requests. A previously issued signed URL remains valid until expiry. Existing ownership policies govern metadata deletion. There is no new automatic retention/deletion job: owners must remove their objects and metadata under existing policies. Local drafts persist until saved/discarded/site-data removal. Existing exported downloads cannot be remotely revoked.

Consent applies to this application's supported clients; a malicious participant can independently record media they receive, as with ordinary WebRTC. No legal compliance or forensic consent-audit claim is made. Unshared windows/tabs and system audio outside an explicitly granted screen source are never requested.

## Additive database change

`supabase/migrations/202610280001_live_meeting_state.sql`:

- Adds teacher-only `meeting-state` and participant `media-state` events to the existing authenticated, identity-stamping RPC. Private course membership, read-only Realtime and host-only offer/end permissions remain. A narrowly scoped read-policy exception permits the final `teacher-ended` event after completion commits; completed rooms still reject joins and all other media RPCs.
- Adds a trigger requiring newly written recording paths to match their class UUID and a generated WebM/MP4 basename. Historical rows are preserved; older migrations are unchanged.

No table replacement, data cleanup, hosted migration or provider setting mutation occurred. Apply this migration only after review in an explicitly authorized disposable backend, then verify actual PostgREST, private Realtime and Storage behavior. Deploying the frontend against an unmigrated backend will reject the new events; it is not a supported release combination.

## Automated evidence and outstanding acceptance

The browser suite uses actual installed Chrome, native WebRTC, canvas, Web Audio, MediaRecorder, IndexedDB and FFmpeg decoding. Supabase HTTP/Auth/Realtime are deterministic intercepted fixtures, not live services. Deterministic device fixtures first exercise Chrome's fake-device capture/permission path, then supply actual generated video/audio tracks. Presentation selection is an explicitly test-only generated stream, not proof that an OS/window/tab picker was operated. A separate native API test, without fake UI/device flags, checks that screen capture is rejected or remains pending approval and never supplies an unapproved stream.

The full recording scenario uses independent teacher and student contexts, purple/440-Hz teacher media, green/880-Hz student media and orange/1320-Hz presentation media. It checks real sender-track mute, camera restoration, remote decoded video, presentation receipt, browser-driven presentation termination, repeated sharing, participant leave/rejoin, real hidden/visible intervals, rapid tab switches, playable nonempty encoded output, decoded frequency content and decoded video colors. Viewport checks cover 375/768/1024/1440px, panels, presentation, visible controls/recording indicator, keyboard operation and document overflow. Persistence/reload/upload failure, notice failure, microphone denial, device-unavailable and injected encoder-error recovery are separate scenarios. Three-party coverage includes start-muted/camera-off, exact input selection, independent microphone operation during delayed camera capture and a fresh decoded remote frame after reload; a frozen last frame is insufficient proof of recovery.

The recording journey also captures before/after CDP renderer task-time and JavaScript-heap metrics. These short automated snapshots include test interaction overhead, exclude other browser/media processes and do not prove sustained CPU, seven-party load or a long-duration memory bound.

The analyser aligns decoded audio to container timestamps, tests the muted interval while the remote participant remains audible, and checks audio-packet gaps. Lifecycle evidence includes AudioContext states and native recorder start/stop times; a visible starting notice is not treated as proof that encoding has started. One preliminary run produced a roughly nine-second audio-packet gap; the recording-only diagnostic subsequently passed with both tones in the hidden interval and no such gap. The preliminary failure remains in the evidence, and short passing runs do not establish lossless recording under resource pressure.

Machine-readable results and final counts are in `docs/live-classroom-verification.json`; command/results are summarized in TESTING.md. Ignored run directories retain raw recordings, decoded inspection attachments, screenshots, console events and traces. Selected inspected screenshots are in `docs/screenshots/live-classroom-*`.

Validated browser scope is desktop Google Chrome on Linux, headed and headless as recorded. Other Chromium browsers may support these APIs but are unverified here. Firefox, Safari/macOS, iOS, physical Android, hardware device switching, mobile picker UX, real long-duration/resource-limit behavior and screen-lock/sleep recovery remain unverified. MP4 fallback is capability handling, not Safari acceptance.

**Release gates still open:** authorized hosted migration/private topic checks, real consent/late-join notices and storage upload/sign/download/revocation, real native presentation sources and supported tab/system audio, cross-network/multi-device acceptance, configured credentialed TURN relay, seven-party CPU/bandwidth/load testing, physical device/browser/accessibility review and retention policy approval. The application still has STUN-only ICE configuration; restrictive NAT/firewalls can prevent meetings. Provisioning TURN requires a separately reviewed credential-delivery/configuration integration; no paid provider or service is introduced here.

No Google Meet parity, uninterrupted background video, production readiness, push or deployment is claimed.

## Delivery evidence

Final checks: **127 Vitest / 52 SQL / 77 Chrome / 3 headed recording repetitions / 4 native PostgreSQL races**, all passed. Security: six tests; build/config: three tests; current npm audit: zero known findings. The full verify chain exited 0. See [TESTING.md](../TESTING.md#live-classroom-redesign-and-recording--verified-29-october-2026) for exact scope, attempts and commands.

The final headless file decodes to 53.553 seconds at 1280×720, with VP8 video and Opus audio. Teacher/student/presentation tones at 440/880/1320 Hz are all present; decoded peak amplitude is 0.320367 and no sample clips. Maximum audio-packet gap is 217 ms. Video inspection found 155,326 purple teacher pixels, 142,214 green student pixels and 63,150 orange presentation pixels across sampled, downscaled frames. The native hidden interval is 14.764 seconds, followed by four rapid tab switches. Recording has one start/stop and the same two output tracks. Headed per-run values, file hashes, exact changed files and remaining acceptance gates are in [live-classroom-verification.json](live-classroom-verification.json).

Raw encoded files, traces and before/after regressions remain local in `artifacts/classroom-completion/`. Checked-in screenshots are explicitly fixture media:

- [375px presentation](screenshots/live-classroom-375.png), [768px](screenshots/live-classroom-768.png), [1024px](screenshots/live-classroom-1024.png), [1440px](screenshots/live-classroom-1440.png).
- [Teacher grid/recordings](screenshots/live-classroom-teacher.png), [student grid](screenshots/live-classroom-student.png), [Bangla mobile chat](screenshots/live-classroom-bangla-375.png).

### Exact changed files

- `README.md`
- `TESTING.md`
- `docs/BUG_FIX_LOG.md`
- `docs/LIVE_CLASSROOM.md`
- `docs/SHIKKHAHUB_AUDIT_REPORT.md`
- `docs/live-classroom-verification.json`
- `docs/screenshots/live-classroom-1024.png`
- `docs/screenshots/live-classroom-1440.png`
- `docs/screenshots/live-classroom-375.png`
- `docs/screenshots/live-classroom-768.png`
- `docs/screenshots/live-classroom-bangla-375.png`
- `docs/screenshots/live-classroom-student.png`
- `docs/screenshots/live-classroom-teacher.png`
- `e2e/classroom-media.ts`
- `e2e/classroom.spec.ts`
- `e2e/fixture.ts`
- `e2e/live.spec.ts`
- `e2e/native-chrome.ts`
- `src/features/auth/AuthContext.test.tsx`
- `src/features/auth/AuthContext.tsx`
- `src/features/live-classes/LiveClassroom.tsx`
- `src/features/live-classes/MediaTile.tsx`
- `src/features/live-classes/MeetingRecorder.ts`
- `src/features/live-classes/RecordingPanel.tsx`
- `src/features/live-classes/media-errors.test.ts`
- `src/features/live-classes/recording-store.ts`
- `src/features/live-classes/useWebRTCBroadcast.ts`
- `src/pages/LiveClass.tsx`
- `supabase/migrations/202610280001_live_meeting_state.sql`
- `tests/database.mjs`
- `tests/database.test.mjs`

Implementation and browser/database regressions are committed locally as `387b1b4` (`Stabilize live classroom media and recording lifecycle`). The verification documentation/screenshots are in the following local commit; see Git history. No push or deployment occurred.
