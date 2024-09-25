"use client";
import React from "react";
import { Switch } from "antd";
import * as NotehubJs from "@blues-inc/notehub-js";

interface EventsResponse {
  events: {
    body: {
      "led-state": string;
      id: string;
    };
  }[];
}

const Home = () => {
  // How often to poll for new events, in milliseconds. Note that retrieving events
  // does use consumption credits (https://blues.com/pricing/#ess-essentials).
  const POLL_INVERVAL_MS = 5000;

  const projectUID = process.env.NEXT_PUBLIC_APP_UID;
  const deviceUID = process.env.NEXT_PUBLIC_DEVICE_UID;
  const defaultClient = NotehubJs.ApiClient.instance;
  const api_key = defaultClient.authentications["api_key"];
  api_key.apiKey = process.env.NEXT_PUBLIC_NOTEHUB_API_KEY;

  const eventApiInstance = new NotehubJs.EventApi();
  const deviceApiInstance = new NotehubJs.DeviceApi();

  const [lastId, setLastId] = React.useState("");
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [ledState, setLedState] = React.useState(false);

  const getLatestValue = () => {
    // This implementation is simple and only retrieves the latest acknowledgement
    // event. A more sophisticated implementation would retrieve all recent
    // acknowledgement events and cycle through them to ensure the UI is in sync with
    // the device.
    eventApiInstance
      .getProjectEvents(projectUID, {
        deviceUID: [deviceUID],
        files: ["ack.qo"],
        pageSize: 1,
        sortBy: "captured",
        sortOrder: "desc",
      })
      .then((data: EventsResponse) => {
        if (!data || !data.events || data.events.length === 0) {
          return;
        }

        const state = data.events[0].body["led-state"];
        const id = data.events[0].body.id;
        if (lastId && id !== lastId) {
          return;
        }

        setDataLoaded(true);
        setLedState(state === "on");
        setIsPending(false);

        // Clear the lastId so you know the acknowledgment this UI scheduled
        // has been handled
        setLastId("");
      })
      .catch(console.error);
  };

  React.useEffect(() => {
    getLatestValue();
    const intervalId = setInterval(getLatestValue, POLL_INVERVAL_MS);
    return () => clearInterval(intervalId);
  }, [lastId]);

  const generateRandomString = (length: number) => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const updateLed = (checked: boolean) => {
    setLedState(checked);
    setIsPending(true);

    const id = generateRandomString(10);
    setLastId(id);

    const note = new NotehubJs.Note();
    note.body = {
      command: checked ? "led-on" : "led-off",
      id,
    };
    deviceApiInstance
      .handleNoteAdd(projectUID, deviceUID, "commands.qi", note)
      .then(() => console.log("Successfully added note"))
      .catch(console.error);
  };

  return (
    dataLoaded && (
      <div>
        <h2>Device {deviceUID}</h2>
        <form className="fade-in">
          <div>
            <label>Serial number:</label>
            <span>my-device</span>
          </div>
          <div>
            <label>SKU:</label>
            <span>NOTE-WBNAW</span>
          </div>
          <div>
            <label>LED:</label>
            <Switch
              onChange={updateLed}
              value={ledState}
              disabled={isPending}
              loading={isPending}
            />
          </div>
        </form>
      </div>
    )
  );
};

export default Home;
