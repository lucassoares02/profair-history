const router = require("express").Router();

const History = require("@controller/History");

router.get("/status", (req, res) => {
  return res.json({ message: "Running" });
});

router.get("/history", History.find);
router.get("/history/events/:fornecedor/:associado", History.findValueEventsByAssociadoFornecedor);
router.get("/history/client/events/:associado", History.findValueEventsByFornecedorAssociado);
router.get("/history/provider/:fornecedor", History.findValueEventsByFornecedor);
router.get("/history/requests/:fornecedor/:associado/:evento", History.findRequestsByEventsByAssociadoFornecedor);
router.get("/history/details/requests/:fornecedor/:associado/:negociacao", History.findDetailsRequestsByEventsByAssociadoFornecedor);
router.get("/history/list/client/:fornecedor", History.findListClientByProvider);
router.get("/historyprovider/:associado", History.findListProviderbyClient);
router.get("/history/list/provider", History.findListProvider);
router.get("/history/details/client/:fornecedor/:associado", History.findDetailsClientByProvider);
router.get("/history/details/negotiation/:fornecedor/:associado/:negociacao", History.findDetailsNegotiationClientByProvider);

module.exports = router;
