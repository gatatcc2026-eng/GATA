const TurmaService = require("../service/TurmaService");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class TurmaControl {
    #turmaService;

    /**
     * @param {TurmaService} turmaServiceDependency
     */
    constructor(turmaServiceDependency) {
        console.log("✅ TurmaControl.constructor()");
        this.#turmaService = turmaServiceDependency;
    }

    // cria as turmas
    store = async (req, res) => {

    console.log("✅ TurmaControl.store()");

    try {

        console.log(
            "📥 Body recebido:",
            req.body
        );


        const cursoCoordenado =
            req.user?.cursoCoordenado;


        const novaTurma =
            await this.#turmaService.createTurma(
                req.body,
                cursoCoordenado
            );


        return res.status(201).json({

            message:
                "Turma criada com sucesso!",

            idTurma:
                novaTurma

        });

    }
    catch (error) {

        console.error(
            "❌ Erro em TurmaControl.store():",
            error
        );


        if (
            error instanceof ErrorResponse
        ) {

            return res
                .status(error.httpCode)
                .json({

                    error:
                        error.message,

                    details:
                        error.error

                });

        }


        return res
            .status(400)
            .json({

                error:
                    error.message ||
                    "Erro ao criar turma!"

            });

    }

};

    // lista todas as turmas
    index = async (req, res) => {
        console.log("✅ TurmaControl.index()");

        try {

            const cursoCoordenado = req.user?.cursoCoordenado;

            /*
             * ?todos=true ignora o filtro de curso do
             * coordenador logado — usado na tela de edição de
             * aluno, onde o coordenador precisa ver as turmas
             * de outro curso para montar a solicitação de
             * transferência.
             */

            const ignorarFiltro =
                req.query?.todos === "true";

            let turmas = await this.#turmaService.findAll();

            if (cursoCoordenado && !ignorarFiltro) {
                turmas = turmas.filter(
                    turma => Number(turma.Curso_idCurso) === Number(cursoCoordenado)
                );
            }

            return res.status(200).json(turmas);

        } catch (error) {
            console.error("❌ Erro em TurmaControl.index():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar turmas!"
            });
        }
    };

    // busca por id
    show = async (req, res) => {
        console.log("✅ TurmaControl.show()");
        try {
            const { idTurma } = req.params;

            const turma = await this.#turmaService.findById(idTurma);

            if (!turma) {
                return res.status(404).json({
                    error: "Turma não encontrada!"
                });
            }

            return res.status(200).json(turma);

        } catch (error) {
            console.error("❌ Erro em TurmaControl.show():", error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar turma!"
            });
        }
    };

    // update turma
    update = async (req, res) => {
        console.log("✅ TurmaControl.update()");
        try {
            const { idTurma } = req.params;

            const cursoCoordenado = req.user?.cursoCoordenado;

            const atualizado = await this.#turmaService.updateTurma(
                {
                    idTurma,
                    ...req.body
                },
                cursoCoordenado
            );

            if (!atualizado) {
                return res.status(404).json({
                    error: "Turma não encontrada!"
                });
            }

            return res.status(200).json({
                message: "Turma atualizada com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em TurmaControl.update():", error);

            if (error instanceof ErrorResponse) {
                return res.status(error.httpCode).json({
                    error: error.message,
                    details: error.error
                });
            }

            return res.status(400).json({
                error: error.message || "Erro ao atualizar turma!"
            });
        }
    };

    // delete turma
    destroy = async (req, res) => {
        console.log("✅ TurmaControl.destroy()");
        try {
            const { idTurma } = req.params;

            const deletado = await this.#turmaService.delete(idTurma);

            if (!deletado) {
                return res.status(404).json({
                    error: "Turma não encontrada!"
                });
            }

            return res.status(200).json({
                message: "Turma deletada com sucesso!"
            });

        } catch (error) {
            console.error("❌ Erro em TurmaControl.destroy():", error);

            if (error instanceof ErrorResponse) {
                return res.status(error.httpCode).json({
                    error: error.message,
                    details: error.error
                });
            }

            return res.status(400).json({
                error: error.message || "Erro ao deletar turma!"
            });
        }
    };
};