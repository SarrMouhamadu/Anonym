const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const askGemini = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    return "API Gemini non configurée. Veuillez ajouter votre clé dans le fichier .env.";
  }

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

module.exports = {
  askGemini,
};
