# Set up macOS desktop testing

Kaijan includes Appium and its Mac2 driver. Install full Xcode from Apple if it
is missing. Complete Xcode's first launch and required components. The user
handles any license acceptance or system permission prompt. Use a logged-in,
unlocked macOS session and keep the target on the main display.

## Check Xcode and the target

- Run `xcode-select -p` and `xcodebuild -version` on the Mac. If Command Line
  Tools are selected and Xcode is in `/Applications`, verify full Xcode with
  `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -version`.
  Kaijan uses full Xcode from that path when Command Line Tools are selected.
  For a custom Xcode installation, use its developer directory for the host.
- For the user's `.app` path, read `CFBundleIdentifier` from its `Contents/Info.plist`.
  For example, run `/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Contents/Info.plist"`
  after setting `app_path` to the exact supplied path. In Claude Code, save the bundle
  ID as `target.app` in Test Environment, then pass the environment ID to Plan.
  On hosts that accept an inline target, use the bundle ID as `target.app`.

## Handle macOS permission prompts

- If macOS requests Accessibility access for Xcode Helper, have the user grant
  it in **System Settings → Privacy & Security → Accessibility**. Use the helper
  from the same Xcode installation. See [Appium's Mac2 setup guide](https://appium.github.io/appium-mac2-driver/v4/getting-started/).
- If XCTest asks to **Enable UI Automation**, have the user authenticate in the
  system dialog while the Run is waiting. Check `/usr/bin/automationmodetool`
  for the current authentication policy.
- If the Xcode UI-testing helper fails to initialize before the first app
  action, check `/usr/sbin/DevToolsSecurity -status`. If macOS reports that
  developer mode is disabled and the user chooses to enable it on this Mac,
  have the user run `sudo /usr/sbin/DevToolsSecurity -enable` and verify the
  status again. This developer-tools setting is separate from the XCTest
  authentication prompt.
- For a dedicated test Mac, the user can explicitly choose to remove the recurring
  authentication prompt for XCTest. This is a machine-wide security setting.
  With that choice, have the user run the tool directly in Terminal from an
  administrator account and enter that account's password when prompted.

  ```sh
  /usr/bin/automationmodetool enable-automationmode-without-authentication
  /usr/bin/automationmodetool
  ```

  Verify the status says the device does not require user authentication to
  enable Automation Mode. The user can restore the prompt with
  `/usr/bin/automationmodetool disable-automationmode-without-authentication`.
  [Apple Developer Support guidance](https://developer.apple.com/forums/thread/693850)

Keep planning and saved-result reads available while desktop setup is pending.
After setup, verify with the person's authorized desktop check through Kaijan.
If the driver times out, keep the first Run and its observations. Report the
specific permission or setup failure when the evidence identifies it. Confirm
the first Run stopped before any app interaction before starting a fresh Run.
