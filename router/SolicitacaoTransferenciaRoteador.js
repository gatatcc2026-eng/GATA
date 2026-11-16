module.exports = class SolicitacaoTransferenciaRoteador {

    #router;
    #jwtMiddleware;
    #solicitacaoControl;


    constructor(
        router,
        jwtMiddleware,
        solicitacaoControl
    ) {

        console.log(
            "✅ SolicitacaoTransferenciaRoteador.constructor()"
        );

        this.#router =
            router;

        this.#jwtMiddleware =
            jwtMiddleware;

        this.#solicitacaoControl =
            solicitacaoControl;
    }


    createRoutes = () => {

        this.#router.get(
            "/",
            this.#jwtMiddleware.validateToken,
            this.#solicitacaoControl.index
        );


        this.#router.post(
            "/",
            this.#jwtMiddleware.validateToken,
            this.#solicitacaoControl.store
        );


        this.#router.post(
            "/:id/aceitar",
            this.#jwtMiddleware.validateToken,
            this.#solicitacaoControl.aceitar
        );


        this.#router.post(
            "/:id/recusar",
            this.#jwtMiddleware.validateToken,
            this.#solicitacaoControl.recusar
        );


        return this.#router;
    };

};