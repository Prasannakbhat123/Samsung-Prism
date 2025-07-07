export async function sendRITMClick(x, y, isPositive = true) {
  console.log(`[RITM] Sending click:`, { x, y, isPositive });
  const payload = { x, y, is_positive: isPositive };
  console.log("Payload being sent to /add_click:", JSON.stringify(payload));
  try {
    const response = await fetch("/add_click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.success && data.image) {
      // TODO: update mask in UI (implement callback or event as needed)
      // Example: window.dispatchEvent(new CustomEvent('ritm-mask-update', { detail: data.image }));
    } else {
      console.error("RITM click error:", data.error || data);
    }
    return data;
  } catch (err) {
    console.error("Failed to send RITM click:", err);
    return null;
  }
} 