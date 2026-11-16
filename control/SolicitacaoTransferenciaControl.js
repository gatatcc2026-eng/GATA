module.exports = class SolicitacaoTransferenciaControl {

    #solicitacaoService;


    constructor(solicitacaoService) {

        console.log(
            "✅ SolicitacaoTransferenciaControl.constructor()"
        );

        this.#solicitacaoService =
            solicitacaoService;
    }


    // GET /api/v1/solicitacoes-transferencia

    index = async (req, res, next) => {

        try {

            const lista =
                await this.#solicitacaoService
                    .listar(req.user);

            return res
                .status(200)
                .json(lista);

        } catch (error) {

            next(error);
        }
    };


    // POST /api/v1/solicitacoes-transferencia

    store = async (req, res, next) => {

        try {

            const resultado =
                await this.#solicitacaoService
                    .criar(
                        req.body,
                        req.user
                    );

            return res
                .status(201)
                .json(resultado);

        } catch (error) {

            next(error);
        }
    };


    // POST /api/v1/solicitacoes-transferencia/:id/aceitar

    aceitar = async (req, res, next) => {

        try {

            const resultado =
                await this.#solicitacaoService
                    .aceitar(
                        Number(req.params.id),
                        req.user
                    );

            return res
                .status(200)
                .json(resultado);

        } catch (error) {

            next(error);
        }
    };


    // POST /api/v1/solicitacoes-transferencia/:id/recusar

    recusar = async (req, res, next) => {

        try {

            const resultado =
                await this.#solicitacaoService
                    .recusar(
                        Number(req.params.id),
                        req.user
                    );

            return res
                .status(200)
                .json(resultado);

        } catch (error) {

            next(error);
        }
    };

};