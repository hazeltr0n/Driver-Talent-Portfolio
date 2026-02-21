#!/usr/bin/env node
/**
 * Match Driver to Job Requisition
 *
 * Usage (via Claude Code):
 * "Match Larenzo Davis to the ABC Freight job"
 */

import 'dotenv/config';
import { findCandidateBySlug, findCandidateByName, updateCandidate } from './lib/airtable.js';
import { calculateFitScores, formatFitSummary } from './lib/scoring.js';
import { generateCareerAgentRecommendation } from './lib/openai.js';
import { getRequisition, listActiveRequisitions } from './create-requisition.js';

export async function matchDriverToJob(driverIdentifier, requisitionId) {
  console.log('Loading driver data...');

  // Find driver by name or slug
  let driver = await findCandidateByName(driverIdentifier);
  if (!driver) {
    const slug = driverIdentifier.toLowerCase().replace(/\s+/g, '-');
    driver = await findCandidateBySlug(slug);
  }

  if (!driver) {
    throw new Error(`Driver not found: ${driverIdentifier}`);
  }

  console.log(`Found driver: ${driver.fields.fullName}`);

  // Load requisition
  console.log('Loading job requisition...');
  const requisition = await getRequisition(requisitionId);
  console.log(`Found job: ${requisition.fields.title} at ${requisition.fields.employer}`);

  // Parse JSON fields
  const driverData = {
    ...driver.fields,
    employment_history: parseJSON(driver.fields.employment_history),
    equipment_experience: parseJSON(driver.fields.equipment_experience),
  };

  const reqData = requisition.fields;

  // Calculate fit scores
  console.log('\nCalculating fit scores...');
  const fitScores = calculateFitScores(driverData, reqData);
  const summary = formatFitSummary(fitScores);

  console.log(`Overall Score: ${summary.overallScore}`);
  console.log(`Recommendation: ${summary.recommendation}`);

  // Generate AI recommendation
  console.log('\nGenerating Career Agent recommendation...');
  const aiRecommendation = await generateCareerAgentRecommendation(
    driverData,
    reqData,
    fitScores
  );

  // Build job fit object to store
  const jobFit = {
    employer: reqData.employer,
    role: reqData.title,
    overallScore: summary.overallScore,
    dimensions: summary.dimensions,
    recommendation: aiRecommendation,
    requisitionId: requisition.id,
    matchedAt: new Date().toISOString(),
  };

  // Update driver record with job fit data
  console.log('\nSaving match to driver record...');
  await updateCandidate(driver.id, {
    job_fit_data: JSON.stringify(jobFit),
  });

  // Output
  console.log('\n' + '='.repeat(60));
  console.log('Driver-Job Match Complete!');
  console.log('='.repeat(60));
  console.log(`\nDriver: ${driver.fields.fullName}`);
  console.log(`Job: ${reqData.title} at ${reqData.employer}`);
  console.log(`\nOverall Fit Score: ${summary.overallScore}/100`);
  console.log(`\nDimension Scores:`);
  for (const dim of summary.dimensions) {
    console.log(`  ${dim.name}: ${dim.score} - ${dim.note}`);
  }
  console.log(`\nCareer Agent Recommendation:`);
  console.log(`  ${aiRecommendation}`);

  const slug = driver.fields.portfolio_slug;
  const baseUrl = process.env.VERCEL_URL || 'https://driver-talent-portfolio.vercel.app';
  console.log(`\nView portfolio with match: ${baseUrl}/portfolio/${slug}`);

  return {
    driver: driver.fields.fullName,
    job: `${reqData.title} at ${reqData.employer}`,
    ...summary,
    recommendation: aiRecommendation,
  };
}

export async function findBestMatches(driverIdentifier, topN = 3) {
  console.log('Loading driver data...');

  let driver = await findCandidateByName(driverIdentifier);
  if (!driver) {
    const slug = driverIdentifier.toLowerCase().replace(/\s+/g, '-');
    driver = await findCandidateBySlug(slug);
  }

  if (!driver) {
    throw new Error(`Driver not found: ${driverIdentifier}`);
  }

  console.log(`Found driver: ${driver.fields.fullName}`);

  // Load all active requisitions
  console.log('Loading active job requisitions...');
  const requisitions = await listActiveRequisitions();
  console.log(`Found ${requisitions.length} active jobs`);

  // Parse driver data
  const driverData = {
    ...driver.fields,
    employment_history: parseJSON(driver.fields.employment_history),
    equipment_experience: parseJSON(driver.fields.equipment_experience),
  };

  // Score each job
  const matches = [];
  for (const req of requisitions) {
    const fitScores = calculateFitScores(driverData, req.fields);
    matches.push({
      requisition: req,
      ...formatFitSummary(fitScores),
    });
  }

  // Sort by score and return top N
  matches.sort((a, b) => b.overallScore - a.overallScore);
  const topMatches = matches.slice(0, topN);

  console.log('\n' + '='.repeat(60));
  console.log(`Top ${topN} Job Matches for ${driver.fields.fullName}`);
  console.log('='.repeat(60));

  for (let i = 0; i < topMatches.length; i++) {
    const match = topMatches[i];
    const req = match.requisition.fields;
    console.log(`\n${i + 1}. ${req.title} at ${req.employer}`);
    console.log(`   Score: ${match.overallScore} - ${match.recommendation}`);
    console.log(`   Pay: $${req.pay_min}-$${req.pay_max}/week | ${req.route_type} | ${req.location}`);
  }

  return topMatches;
}

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

export { matchDriverToJob as default };
