module.exports = class HistoricoCoordenadorControl {

    #historicoCoordenadorService;

    constructor(historicoCoordenadorServiceDependency) {
        console.log("✅ HistoricoCoordenadorControl.constructor()");
        this.#historicoCoordenadorService = historicoCoordenadorServiceDependency;
    }

    index = async (req, res) => {

        console.log("✅ HistoricoCoordenadorControl.index()");

        try {

            const registro = req.user?.registro;

            if (!registro) {
                return res.status(401).json({
                    error: "Usuário não identificado!"
                });
            }

            const historico = await this.#historicoCoordenadorService.findAll(registro);

            return res.status(200).json(historico);

        } catch (error) {

            console.error("❌ Erro em HistoricoCoordenadorControl.index():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar histórico!"
            });
        }
    };

    store = async (req, res) => {

        console.log("✅ HistoricoCoordenadorControl.store()");

        try {

            /* quem registra é sempre o usuário do token, não o do body */
            const registro = req.user?.registro;

            const { acao, descricao, Curso_idCurso } = req.body;

            if (!registro) {
                return res.status(401).json({
                    error: "Usuário não identificado!"
                });
            }

            if (!acao) {
                return res.status(400).json({
                    error: "acao é obrigatória!"
                });
            }

            const id = await this.#historicoCoordenadorService.registrar(
                registro,
                acao,
                descricao || "",
                Curso_idCurso
            );

            return res.status(201).json({
                message: "Ação registrada com sucesso!",
                id
            });

        } catch (error) {

            console.error("❌ Erro em HistoricoCoordenadorControl.store():", error);

            return res.status(400).json({
                error: error.message || "Erro ao registrar ação!"
            });
        }
    };
};