# Notecard Acknowledgment Example

This sample app demonstrates how to control a device from the cloud by storing the device's state in a [DB Notefile](https://dev.blues.io/guides-and-tutorials/notecard-guides/storing-device-state-with-db-notefiles/). A web app writes the state it wants the device to have, the device applies that state, and the device acknowledges the change by reporting the state it actually has.

* The [firmware](/firmware) is a PlatformIO project that runs on a Blues Swan.
* The [web app](/webapp) is a Next.js project you can run locally or host on any cloud hosting provider.

See [Controlling Device State and Receiving Acknowledgment](https://dev.blues.io/example-apps/samples/controlling-device-state-and-receiving-acknowledgment/) for a full tutorial.
