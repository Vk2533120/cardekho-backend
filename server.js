const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const POR = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read local JSON data
const getCarsData = () => {
  const filePath = path.join(__dirname, 'data', 'cars.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
};

// Recommendation Engine POST Endpoint
app.post('/api/recommend', (expressReq, expressRes) => {
  try {
    const { budget, useCase, priority } = expressReq.body;

    // Validation
    if (!budget || !useCase || !priority) {
      return expressRes.status(400).json({ error: 'Please provide budget, useCase, and priority.' });
    }

    const allCars = getCarsData();

    // Step 1: Strict budget filtering
    // budget mapped options: 'budget', 'midrange', 'premium'
    const budgetFilteredCars = allCars.filter(car => car.budgetCategory === budget);

    // Step 2: Scoring Engine
    const scoredCars = budgetFilteredCars.map(car => {
      let score = 0;
      let matchingPoints = [];

      // Check Use Case Match
      if (car.tags.includes(useCase)) {
        score += 3; // Use case matches are weighted high
        matchingPoints.push(`perfectly fits your ${useCase} needs`);
      }

      // Check Priority Match via tags
      if (car.tags.includes(priority)) {
        score += 3;
        matchingPoints.push(`excels in delivering high ${priority}`);
      }

      // Extra verification layers if priority didn't explicitly map to general tags
      if (priority === 'safety' && car.safetyRating >= 4) {
        score += 2;
        if (!car.tags.includes('safety')) matchingPoints.push(`offers a solid ${car.safetyRating}-star safety rating`);
      }
      if (priority === 'mileage' && car.mileage >= 19) {
        score += 2;
        if (!car.tags.includes('mileage')) matchingPoints.push(`delivers a stellar ${car.mileage} kmpl mileage`);
      }

      // Format custom string for UI display mapping fields down to what frontend layout expects
      let recommendationReason = '';
      if (matchingPoints.length > 0) {
        recommendationReason = `The ${car.model} is a top choice because it ${matchingPoints.join(' and ')}.`;
      } else {
        recommendationReason = `A great reliable choice within the ${car.budgetCategory} segment.`;
      }

      return {
        name: `${car.make} ${car.model}`,
        price: `₹ ${car.priceINR}`,
        segment: `${car.budgetCategory.toUpperCase()} Segment`,
        fuelType: car.mileage > 20 ? 'Highly Efficient Petrol/CNG' : 'Petrol/Diesel',
        highlight: recommendationReason,
        score: score
      };
    });

    // Step 3: Sort by descending score and take the top 3
    const topMatches = scoredCars
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return expressRes.json(topMatches);

  } catch (error) {
    console.error('Recommendation Endpoint Error:', error);
    return expressRes.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`CarDekho Mock Backend running on http://localhost:${PORT}`);
});
