const xlsx = require("xlsx");

module.exports = class ExcelService {

    lerPlanilha = (caminhoArquivo) => {

        const workbook = xlsx.readFile(caminhoArquivo);

        const nomePlanilha = workbook.SheetNames[0];

        const planilha = workbook.Sheets[nomePlanilha];

        const dados = xlsx.utils.sheet_to_json(planilha);

        return dados;
    } 
}