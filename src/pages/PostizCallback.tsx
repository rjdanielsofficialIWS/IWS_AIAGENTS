const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  // Handle GET (for testing in browser)
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Function is live",
      }),
    };
  }

  // Only allow POST for OAuth
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Method Not Allowed",
      }),
    };
  }

  try {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "POST received",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};