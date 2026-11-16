const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class NotaControl {

    #notaService;

    constructor(notaServiceDependency) {

        console.log(
            "✅ NotaControl.constructor()"
        );

        this.#notaService =
            notaServiceDependency;
    }


    // =====================================================
    // RESPOSTA DE ERRO
    // (ErrorResponse mantém o status, ex.: 403 notas fechadas)
    // =====================================================

    #responderErro = (
        res,
        error,
        statusPadrao,
        mensagemPadrao
    ) => {

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
            .status(statusPadrao)
            .json({
                error:
                    error.message ||
                    mensagemPadrao
            });
    };


    // =====================================================
    // CREATE
    // =====================================================

    store = async (req, res) => {

        console.log(
            "✅ NotaControl.store()"
        );

        try {

            console.log(
                "📌 BODY:",
                req.body
            );

            const novaNota =
                await this.#notaService.createNota(
                    req.body,
                    req.user
                );

            console.log(
                "✅ Nota criada com sucesso:",
                novaNota
            );

            return res
                .status(201)
                .json({
                    message:
                        "Nota criada com sucesso!",

                    idNota:
                        novaNota
                });

        } catch (error) {

            console.error(
                "❌ Erro em NotaControl.store():",
                error
            );

            return this.#responderErro(
                res,
                error,
                400,
                "Erro ao criar nota!"
            );
        }
    };


    // =====================================================
    // FIND ALL
    // =====================================================

    index = async (req, res) => {

        console.log(
            "✅ NotaControl.index()"
        );

        try {

            const notas =
                await this.#notaService.findAll();

            return res
                .status(200)
                .json(notas);

        } catch (error) {

            console.error(
                "❌ Erro em NotaControl.index():",
                error
            );

            return this.#responderErro(
                res,
                error,
                500,
                "Erro ao buscar notas!"
            );
        }
    };


    // =====================================================
    // FIND BY ID
    // =====================================================

    show = async (req, res) => {

        console.log(
            "✅ NotaControl.show()"
        );

        try {

            const {
                idNota
            } = req.params;

            const nota =
                await this.#notaService.findById(
                    idNota
                );

            if (!nota) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Nota não encontrada!"
                    });
            }

            return res
                .status(200)
                .json(nota);

        } catch (error) {

            console.error(
                "❌ Erro em NotaControl.show():",
                error
            );

            return this.#responderErro(
                res,
                error,
                500,
                "Erro ao buscar nota!"
            );
        }
    };


    // =====================================================
    // UPDATE
    // =====================================================

    update = async (req, res) => {

        console.log(
            "✅ NotaControl.update()"
        );

        try {

            const {
                idNota
            } = req.params;

            const atualizado =
                await this.#notaService.updateNota(
                    {
                        idNota,

                        ...req.body
                    },
                    req.user
                );

            if (!atualizado) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Nota não encontrada!"
                    });
            }

            return res
                .status(200)
                .json({
                    message:
                        "Nota atualizada com sucesso!"
                });

        } catch (error) {

            console.error(
                "❌ Erro em NotaControl.update():",
                error
            );

            return this.#responderErro(
                res,
                error,
                400,
                "Erro ao atualizar nota!"
            );
        }
    };


    // =====================================================
    // DELETE
    // =====================================================

    destroy = async (req, res) => {

        console.log(
            "✅ NotaControl.destroy()"
        );

        try {

            const {
                idNota
            } = req.params;

            const deletado =
                await this.#notaService.delete(
                    idNota,
                    req.user
                );

            if (!deletado) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Nota não encontrada!"
                    });
            }

            return res
                .status(200)
                .json({
                    message:
                        "Nota deletada com sucesso!"
                });

        } catch (error) {

            console.error(
                "❌ Erro em NotaControl.destroy():",
                error
            );

            return this.#responderErro(
                res,
                error,
                400,
                "Erro ao deletar nota!"
            );
        }
    };

};