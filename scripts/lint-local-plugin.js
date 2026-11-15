const noComments = {
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang") continue;
          context.report({
            loc: comment.loc,
            message: "Comments are not allowed.",
          });
        }
      },
    };
  },
};

const local = { rules: { "no-comments": noComments } };

export default local;
