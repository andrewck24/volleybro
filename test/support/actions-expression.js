import { runInNewContext } from "node:vm";

export function evaluateActionsExpression(expression, context) {
  return runInNewContext(expression.replace(/^\$\{\{(.*)\}\}$/s, "$1"), {
    ...context,
    always: () => true,
    format: (template, value) => template.replace("{0}", value),
  });
}

export function renderActionsTemplate(template, context) {
  return template.replace(/\$\{\{(.*?)\}\}/g, (_, expression) =>
    evaluateActionsExpression(expression, context),
  );
}
