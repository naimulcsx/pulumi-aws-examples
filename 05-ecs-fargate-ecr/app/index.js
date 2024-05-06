const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 80;

// Route to fetch ECS task metadata
app.get("/", async (req, res) => {
  try {
    // Get ECS metadata endpoint URL from environment variable
    const metadataEndpoint = process.env.ECS_CONTAINER_METADATA_URI_V4;

    if (!metadataEndpoint) {
      throw new Error(
        "ECS_CONTAINER_METADATA_URI_V4 environment variable not found"
      );
    }

    // Fetch ECS task metadata
    const response = await axios.get(`${metadataEndpoint}/task`, {
      headers: {
        "Metadata-Flavor": "ECS_CONTAINER",
      },
    });

    // Send metadata as response
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching ECS metadata" });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
