export const parseMessageBody = (text) => {
  if (text && text.startsWith("[INVOICE]:")) {
    try {
      const payload = JSON.parse(text.substring(10));
      return { type: "invoice", amount: payload.amount, desc: payload.desc };
    } catch (e) {
      return { type: "text", text: text };
    }
  }
  return { type: "text", text: text };
};
