const fetchBtn = document.getElementById("fetchBtn");
const homeBtn = document.getElementById("homeBtn");
const ctx = document.getElementById("emgChart").getContext("2d");
const summaryBox = document.getElementById("ai-summary");
const scrollSection = document.querySelector(".scroll-section");
const dataActions = document.querySelector(".data-actions");
const downloadBtn = document.getElementById("downloadBtn");
const sendBtn = document.getElementById("sendBtn");

let chart;
let lastFetchedData = [];
let lastFetchedTime = [];

// Debug log to verify JS loaded
console.log("JS LOADED SUCCESSFULLY");

window.addEventListener("scroll", () => {
  if (window.scrollY > window.innerHeight * 0.5) {
    scrollSection.classList.add("visible");
    homeBtn.classList.add("show");
  }
});

async function fetchEMG() {
  console.log("fetchEMG CALLED");

  const url = "https://api.thingspeak.com/channels/3073213/fields/1.json?api_key=0JGYR24A33IT0QCB&results=20";

  try {
    const res = await fetch(url);
    const data = await res.json();

    const raw = data.feeds.map(f => f.field1);
    const filtered = raw.filter(v => v !== "" && v !== null && v !== undefined);
    const values = filtered.map(v => parseFloat(v));

    console.log("Raw:", raw);
    console.log("Filtered:", filtered);
    console.log("Values:", values);

    const times = data.feeds
      .filter(f => f.field1 !== "" && f.field1 !== null && f.field1 !== undefined)
      .map(f => {
        const d = new Date(f.created_at);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
      });

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: times,
        datasets: [{
          label: "EMG Signal",
          data: values,
          borderColor: "#bb86fc",
          backgroundColor: "rgba(187,134,252,0.2)",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#fff" } } },
        scales: {
          x: { ticks: { color: "#fff" } },
          y: { ticks: { color: "#fff" } }
        }
      }
    });

    summarizeData(values, times);

  } catch (err) {
    console.error("FETCH ERROR", err);
    summaryBox.innerHTML = "<p><strong>Error</strong> Unable to fetch data</p>";
    summaryBox.classList.add("show");
  }
}

function summarizeData(values, times) {
  console.log("summarizeData CALLED");

  const avg = values.reduce((a,b) => a+b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const activityLevel =
    avg > 50 ? "⚡ Strong muscle contractions" :
    avg > 20 ? "Moderate engagement" :
    "Muscles mostly relaxed";

  summaryBox.innerHTML = `
    <h3>NeuroFlex EMG Analysis</h3>
    <p><strong>Average Value:</strong> ${avg.toFixed(2)} µV</p>
    <p><strong>Peak Activity:</strong> ${max} µV</p>
    <p><strong>Lowest Reading:</strong> ${min} µV</p>
    <p><strong>Activity Level:</strong> ${activityLevel}</p>
  `;

  summaryBox.classList.add("show");

  lastFetchedData = values;
  lastFetchedTime = times;

  dataActions.classList.add("show");
}

fetchBtn.addEventListener("click", () => {
  console.log("BUTTON CLICKED");
  fetchEMG();
});

homeBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
sendBtn.addEventListener("click", () => {
  document.getElementById("emailModal").style.display = "flex";
});

document.getElementById("cancelModal").addEventListener("click", () => {
  document.getElementById("emailModal").style.display = "none";
});

document.getElementById("sendModal").addEventListener("click", async () => {
  const userEmail = document.getElementById("emailInput").value;

  if (!userEmail || !userEmail.includes("@")) {
    alert("Enter a valid email");
    return;
  }

  document.getElementById("emailModal").style.display = "none";

  const avg = lastFetchedData.reduce((a, b) => a + b, 0) / lastFetchedData.length;
  const max = Math.max(...lastFetchedData);
  const min = Math.min(...lastFetchedData);

  const summary =
    "NeuroFlex EMG Analysis\n" +
    "Average Value: " + avg.toFixed(2) + " uV\n" +
    "Peak Activity: " + max + " uV\n" +
    "Lowest Reading: " + min + " uV\n" +
    "Activity Level: " +
    (avg > 50 ? "Strong contraction" : avg > 20 ? "Moderate engagement" : "Relaxed");

  let csvContent = "Time,Value\n";
  lastFetchedData.forEach((v, i) => {
    csvContent += lastFetchedTime[i] + "," + v + "\n";
  });

  const base64CSV = btoa(csvContent);

  const params = {
    to_email: userEmail,
    report_summary: summary,
    attachment_name: "NeuroFlex_EMG_Data.csv",
    attachment_data: base64CSV
  };

  try {
    await emailjs.send("service_9o8y772", "template_3tmhtmg", params);
    alert("Report sent successfully");
  } catch (err) {
    console.error("Email error", err);
    alert("Failed to send");
  }
});

downloadBtn.addEventListener("click", () => {
  if (!lastFetchedData.length) {
    alert("No data to export");
    return;
  }

  let csv = "Time,Value\n";

  lastFetchedData.forEach((v, i) => {
    csv += `${lastFetchedTime[i]},${v}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "NeuroFlex_EMG_Data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
