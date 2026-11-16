module.exports = class ConfiguracaoNotasRoteador {

    #router;
    #jwtMiddleware;
    #configuracaoNotasControl;


    constructor(
        router,
        jwtMiddleware,
        configuracaoNotasControl
    ) {

        console.log(
            "✅ ConfiguracaoNotasRoteador.constructor()"
        );

        this.#router =
            router;

        this.#jwtMiddleware =
            jwtMiddleware;

        this.#configuracaoNotasControl =
            configuracaoNotasControl;
    }


    createRoutes = () => {

        this.#router.get(
            "/",
            this.#jwtMiddleware.validateToken,
            this.#configuracaoNotasControl.getEstado
        );


        this.#router.post(
            "/fechar",
            this.#jwtMiddleware.validateToken,
            this.#configuracaoNotasControl.fechar
        );


        this.#router.post(
            "/liberar",
            this.#jwtMiddleware.validateToken,
            this.#configuracaoNotasControl.liberar
        );


        return this.#router;
    };

};