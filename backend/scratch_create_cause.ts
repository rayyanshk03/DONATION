

async function main() {
  const url = "http://localhost:4000/api/causes";
  const body = {
    name: "Clean Water Wells for Rural Communities",
    description: "Constructing solar-powered clean water wells in dry rural areas to provide access to drinkable water.",
    wallet: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    icon: "💧",
    tag: "Humanitarian",
    goalUsd: 75000
  };

  console.log("POSTing to /api/causes to create new campaign...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const status = response.status;
    const data = await response.json();
    console.log("Response Status:", status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error POSTing:", error);
  }
}

main();
