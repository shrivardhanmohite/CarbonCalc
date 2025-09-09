import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

const apiKey = "AIzaSyCoKBEr7LjkYr0mmzlM9goskd6Lmv5HP3I"; // replace with your Gemini API key
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

document.addEventListener("DOMContentLoaded", () => {
  const calBtn = document.getElementById("cal");
  const sendBtn = document.getElementById("sendBtn");

  let lastCalculation = null; // store the latest calculation
  let lastSuggestion = null;  // store AI suggestion

  // -----------------------
  // Calculate Carbon Footprint
  // -----------------------
  function calculateFootprint() {
    const family = parseFloat(document.getElementById("family_member").value) || 0;
    const electricity = parseFloat(document.getElementById("electricity").value) || 0;
    const petrol = parseFloat(document.getElementById("petrol").value) || 0;
    const diesel = parseFloat(document.getElementById("diesel").value) || 0;
    const meat = parseFloat(document.getElementById("meat").value) || 0;
    const gas = parseFloat(document.getElementById("gas").value) || 0;
    const garbage = parseFloat(document.getElementById("garbage").value) || 0;

    const totalMonthly = (
      (family * 66) +
      (electricity * 0.5) +
      (petrol * 2.3) +
      (diesel * 2.7) +
      (meat * 27) +
      (gas * 2.3) +
      (garbage * 0.5)
    ).toFixed(2);

    const totalDaily = (totalMonthly / 30).toFixed(2);

    document.getElementById("result-monthly").textContent = totalMonthly;
    document.getElementById("result-daily").textContent = totalDaily;

    lastCalculation = `Monthly: ${totalMonthly} kg, Daily: ${totalDaily} kg`;
  }

  calBtn.addEventListener("click", calculateFootprint);

  // -----------------------
  // Get AI Suggestions
  // -----------------------
  sendBtn.addEventListener("click", async () => {
    if (!lastCalculation) {
      alert("⚠️ Please calculate first before getting suggestions.");
      return;
    }

    const totalMonthly = document.getElementById("result-monthly").textContent;

    document.getElementById("output").innerHTML = "<em>Getting suggestions...</em>";

    try {
      const prompt = `
      My carbon footprint is ${totalMonthly} kg CO₂ per month.
      Give me **personalized, practical, actionable** tips in bullet points to reduce it.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      lastSuggestion = formatTextResponse(response);
      document.getElementById("output").innerHTML = lastSuggestion;

      // ✅ Save history to backend
      await fetch("/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculation: lastCalculation,
          suggestion: response
        })
      });
    } catch (error) {
      console.error("Error:", error);
      document.getElementById("output").textContent = "❌ Failed to load suggestions.";
    }
  });

  // -----------------------
  // Format AI Response
  // -----------------------
  function formatTextResponse(text) {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/- (.*?)\n/g, "<li>$1</li>")
      .replace(/\n{2,}/g, "<br>");

    if (formatted.includes("<li>")) {
      formatted = `<ul>${formatted.replace(/<\/li><li>/g, "</li><li>")}</ul>`;
    }
    return formatted;
  }
});
