import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PostizCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      console.error("No authorization code returned from Postiz");
      navigate("/mediamachine/dashboard?error=postiz");
      return;
    }

    const exchangeToken = async () => {
      try {
        const response = await fetch("/.netlify/functions/postiz-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (data.access_token) {
          localStorage.setItem("postiz_access_token", data.access_token);

          navigate("/mediamachine/dashboard?connected=postiz");
        } else {
          console.error("Token exchange failed", data);
          navigate("/mediamachine/dashboard?error=postiz");
        }

      } catch (error) {
        console.error("OAuth error:", error);
        navigate("/mediamachine/dashboard?error=postiz");
      }
    };

    exchangeToken();
  }, [navigate]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      Connecting your Postiz account...
    </div>
  );
}