const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function injectMockReports() {
  console.log("Injecting 3 mock flood reports in Korangi...");
  
  const reports = [
    {
      reportedBy: "mock_user_1",
      location: { lat: 24.8138, lng: 67.1146 },
      type: "flood",
      severity: "high",
      description: "Water level rising rapidly, cars are submerged.",
      city: "Karachi",
      status: "active",
      upvotes: 2,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      reportedBy: "mock_user_2",
      location: { lat: 24.8140, lng: 67.1150 },
      type: "flood",
      severity: "high",
      description: "Main road blocked by heavy water flow.",
      city: "Karachi",
      status: "active",
      upvotes: 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      reportedBy: "mock_user_3",
      location: { lat: 24.8135, lng: 67.1140 },
      type: "flood",
      severity: "high",
      description: "Water entering houses on street 5.",
      city: "Karachi",
      status: "active",
      upvotes: 5,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }
  ];

  for (const report of reports) {
    const ref = await db.collection("reports").add(report);
    console.log(`Injected report: ${ref.id}`);
  }
  
  console.log("Mock injection complete.");
  process.exit(0);
}

injectMockReports();
