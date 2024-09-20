import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="en">
    <title>Blues Acknowledgement Example</title>
    <body>
      <AntdRegistry>{children}</AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
