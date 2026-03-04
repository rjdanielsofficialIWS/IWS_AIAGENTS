import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PostizCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const runOAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const code = params.get("code");
        const error = params.get("error");

        if (error) {
          console.error("Postiz OAuth error:", error);
          navigate("/mediamachine/dashboard?error=postiz_denied");
          return;
        }

        if (!code) {
          console.error("No authorization code received");
          navigate("/mediamachine/dashboard?error=no_code");
          return;
        }

        const response = await fetch("/.netlify/functions/postiz-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error("Token exchange failed:", data);
          navigate("/mediamachine/dashboard?error=token_exchange_failed");
          return;
        }

        navigate("/mediamachine/dashboard?connected=postiz");
      } catch (err) {
        console.error("OAuth callback error:", err);
        navigate("/mediamachine/dashboard?error=server_error");
      }
    };

    runOAuth();
  }, [navigate]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
      }}
    >
      Connecting your Postiz account...
    </div>
  );
}