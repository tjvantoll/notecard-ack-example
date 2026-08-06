"use client";
import React from "react";
import { Switch } from "antd";

interface ReportedState {
  flag: boolean;
  time: number;
}

const Home = () => {
  // How often to poll for the device's reported state, in milliseconds.
  const POLL_INTERVAL_MS = 1000 * 5;

  const deviceUID = process.env.NEXT_PUBLIC_DEVICE_UID;

  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [ledState, setLedState] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState("");

  const getReportedState = () => {
    // The /api/led route reads the device's reported state from Notehub. The
    // request goes to this app's own server so the Personal Access Token
    // never reaches the browser.
    fetch("/api/led", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to read reported state: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ReportedState) => {
        setDataLoaded(true);
        setLastUpdated(new Date(data.time * 1000).toLocaleString());

        if (isPending) {
          // Waiting on the device: clear the pending indicator once the
          // device reports the state the user asked for.
          if (data.flag === ledState) {
            setIsPending(false);
          }
        } else {
          // Not waiting on anything: show whatever the device reports.
          setLedState(data.flag);
        }
      })
      .catch(console.error);
  };

  React.useEffect(() => {
    getReportedState();
    const intervalId = setInterval(getReportedState, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [ledState, isPending]);

  const updateLed = (checked: boolean) => {
    setLedState(checked);
    setIsPending(true);

    fetch("/api/led", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flag: checked }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to update led-desired: ${response.status}`);
        }
        console.log("Successfully updated led-desired");
      })
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
            <label>Last Updated:</label>
            <span>{lastUpdated}</span>
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
