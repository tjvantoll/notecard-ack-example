import { NextResponse } from "next/server";
import * as NotehubJs from "@blues-inc/notehub-js";

// This route runs only on the server, which is what lets the Personal Access
// Token stay out of the browser bundle. Talking to Notehub from here also
// avoids CORS entirely, since the request no longer comes from a web page.

const projectUID = process.env.NEXT_PUBLIC_APP_UID;
const deviceUID = process.env.NEXT_PUBLIC_DEVICE_UID;

const defaultClient = NotehubJs.ApiClient.instance;
const auth = defaultClient.authentications["personalAccessToken"];
auth.accessToken = process.env.NOTEHUB_PAT;

const deviceApiInstance = new NotehubJs.DeviceApi();

// Next caches GET route handlers by default, which would freeze the device's
// reported state at whatever it was the first time the app polled.
export const dynamic = "force-dynamic";

interface NoteResponse {
  // The Notecard omits false booleans from its JSON, so a device reporting
  // an off LED produces a Note with no body at all.
  body?: {
    flag?: boolean;
  };
  time: number;
}

// Read the led-reported Note, which holds the state the device actually has —
// the device's acknowledgment. Reading it tells the UI both when a pending
// change has been applied, and about changes made from anywhere else.
export async function GET() {
  try {
    const data: NoteResponse = await deviceApiInstance.getDbNote(
      projectUID,
      deviceUID,
      "vars.db",
      "led-reported"
    );

    return NextResponse.json({
      flag: data.body?.flag === true,
      time: data.time,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to read the device's reported state" },
      { status: 502 }
    );
  }
}

// Write the state the user wants to the led-desired Note. Because this is
// state rather than a command, there's no need to generate an id to correlate
// the change with an acknowledgment — the UI just waits for led-reported to
// match.
export async function POST(request: Request) {
  try {
    const { flag } = await request.json();

    const noteInput = new NotehubJs.NoteInput();
    noteInput.body = { flag: flag === true };
    await deviceApiInstance.updateDbNote(
      projectUID,
      deviceUID,
      "vars.db",
      "led-desired",
      noteInput
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update the device's desired state" },
      { status: 502 }
    );
  }
}
