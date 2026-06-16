const Groq = require('groq-sdk');

console.log('Groq key loaded:', process.env.GROQ_API_KEY?.slice(0, 10));

exports.generateExplanation = async ({ productName, selectedWarehouse, distance, inventory, deliveryDays, cost, finalScore, rejectedWarehouses }) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "AI explanation skipped because GROQ_API_KEY is not set.";
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const promptText = `
You are an expert logistics AI for an Order Routing Engine. We just routed an order for "${productName}".
The selected warehouse is ${selectedWarehouse}.

Details for the winning warehouse:
- Distance: ${distance.toFixed(2)} km
- Inventory Available: ${inventory}
- Delivery Estimate: ${deliveryDays} days
- Cost Estimate: ₹${cost.toFixed(2)}
- Final Routing Score: ${finalScore.toFixed(4)}

Other candidate warehouses that were considered and rejected:
${rejectedWarehouses.map(s => `- ${s.warehouseName}: Score ${s.finalScore.toFixed(4)} (Dist: ${s.distance_km.toFixed(2)}km)`).join('\n')}

Please provide a concise, business-friendly explanation (max 3 sentences) in plain English of why ${selectedWarehouse} was chosen over the others based on these metrics. Be professional and clear.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: promptText }],
      model: "llama-3.1-8b-instant",
      max_tokens: 150,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error('Groq API Error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return 'Failed to generate AI explanation.';
  }
};
