const { prisma } = require('../index');

const evaluateSegmentRules = async (rules) => {
  try {
    // Build the base query
    let whereClause = {};

    // Handle different rule types
    if (rules.type === 'AND') {
      whereClause = {
        AND: rules.conditions.map(condition => buildCondition(condition)),
      };
    } else if (rules.type === 'OR') {
      whereClause = {
        OR: rules.conditions.map(condition => buildCondition(condition)),
      };
    } else {
      // Single condition
      whereClause = buildCondition(rules);
    }

    // Execute query
    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: { id: true },
    });

    return customers.map(c => c.id);
  } catch (error) {
    console.error('Error evaluating segment rules:', error);
    throw error;
  }
};

const buildCondition = (condition) => {
  const { field, operator, value } = condition;

  switch (field) {
    case 'totalSpend':
      return buildNumericCondition('totalSpend', operator, parseFloat(value));
    case 'visitCount':
      return buildNumericCondition('visitCount', operator, parseInt(value));
    case 'lastVisit':
      return buildDateCondition('lastVisit', operator, value);
    case 'email':
      return buildStringCondition('email', operator, value);
    default:
      throw new Error(`Unsupported field: ${field}`);
  }
};

const buildNumericCondition = (field, operator, value) => {
  switch (operator) {
    case 'gt':
      return { [field]: { gt: value } };
    case 'gte':
      return { [field]: { gte: value } };
    case 'lt':
      return { [field]: { lt: value } };
    case 'lte':
      return { [field]: { lte: value } };
    case 'eq':
      return { [field]: { equals: value } };
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

const buildDateCondition = (field, operator, value) => {
  const date = new Date(value);
  const now = new Date();

  switch (operator) {
    case 'before':
      return { [field]: { lt: date } };
    case 'after':
      return { [field]: { gt: date } };
    case 'between':
      const [start, end] = value.split(',').map(d => new Date(d));
      return {
        [field]: {
          gte: start,
          lte: end,
        },
      };
    case 'daysAgo':
      const daysAgo = new Date(now.setDate(now.getDate() - parseInt(value)));
      return { [field]: { lt: daysAgo } };
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

const buildStringCondition = (field, operator, value) => {
  switch (operator) {
    case 'contains':
      return { [field]: { contains: value } };
    case 'startsWith':
      return { [field]: { startsWith: value } };
    case 'endsWith':
      return { [field]: { endsWith: value } };
    case 'equals':
      return { [field]: { equals: value } };
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
};

module.exports = {
  evaluateSegmentRules,
}; 