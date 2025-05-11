const OpenAI = require("openai");

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

const generateAIMessage = async ({ objective, segmentName, sampleCustomers }) => {
  try {
    const prompt = `
      Generate a personalized marketing message for a campaign with the following details:
      
      Campaign Objective: ${objective}
      Target Segment: ${segmentName}
      
      Sample Customer Data:
      ${JSON.stringify(sampleCustomers, null, 2)}
      
      Requirements:
      1. The message should be personalized and engaging
      2. Include a clear call-to-action
      3. Keep it concise (max 2-3 sentences)
      4. Use a friendly, conversational tone
      5. Consider the customer's spending history and visit patterns
      
      Generate the message:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a marketing expert specializing in personalized customer communications.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating AI message:", error);
    throw error;
  }
};

const generateCampaignInsights = async (campaignData) => {
  try {
    const prompt = `
      Analyze the following campaign data and generate insights:
      
      Campaign Name: ${campaignData.name}
      Segment: ${campaignData.segment.name}
      Total Recipients: ${campaignData.stats.total}
      Delivery Stats:
      - Sent: ${campaignData.stats.sent || 0}
      - Failed: ${campaignData.stats.failed || 0}
      - Pending: ${campaignData.stats.pending || 0}
      
      Customer Data:
      ${JSON.stringify(campaignData.sampleCustomers, null, 2)}
      
      Generate a brief analysis (2-3 sentences) highlighting:
      1. Key performance metrics
      2. Notable patterns or insights
      3. Potential areas for improvement
      
      Analysis:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a data analyst specializing in marketing campaign performance.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating campaign insights:", error);
    throw error;
  }
};

const generateSegmentRules = async (naturalLanguageQuery) => {
  try {
    const prompt = `
      Convert the following natural language query into structured segment rules:
      
      Query: "${naturalLanguageQuery}"
      
      Available fields and operators:
      - totalSpend: gt, gte, lt, lte, eq
      - visitCount: gt, gte, lt, lte, eq
      - lastVisit: before, after, between, daysAgo
      - email: contains, startsWith, endsWith, equals
      
      Generate the rules in JSON format with the following structure:
      {
        "type": "AND" | "OR",
        "conditions": [
          {
            "field": string,
            "operator": string,
            "value": string | number
          }
        ]
      }
      
      Rules:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a data engineer specializing in customer segmentation rules.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const rules = JSON.parse(completion.choices[0].message.content.trim());
    return rules;
  } catch (error) {
    console.error("Error generating segment rules:", error);
    throw error;
  }
};

module.exports = {
  generateAIMessage,
  generateCampaignInsights,
  generateSegmentRules,
};