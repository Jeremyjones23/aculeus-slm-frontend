import { withWorkflow } from "workflow/next";

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["playwright", "playwright-core"]
};

export default withWorkflow(nextConfig);
