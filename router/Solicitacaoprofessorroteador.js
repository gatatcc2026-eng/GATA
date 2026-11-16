module.exports = class SolicitacaoProfessorRoteador {

    #router;
    #jwtMiddleware;
    #control;


    constructor(router, jwtMiddleware, control) {

        console.log("✅ SolicitacaoProfessorRoteador.constructor() v4");

        this.#router = router;
        this.#jwtMiddleware = jwtMiddleware;
        this.#control = control;
    }


    createRoutes = () => {

        const auth = (req, res, next) =>
            this.#jwtMiddleware.validateToken(req, res, next);

        // Log de diagnóstico: mostra tudo que chega neste roteador
        this.#router.use((req, res, next) => {
            console.log("🛰️ SolicitacaoProfessorRoteador v4:", req.method, req.originalUrl);
            next();
        });

        // Rotas fixas ANTES das rotas com :id
        this.#router.get("/disponiveis", auth, this.#control.disponiveis);

        this.#router.get("/pendentes/total", auth, this.#control.totalPendentes);

        this.#router.get("/", auth, this.#control.index);

        this.#router.post("/", auth, this.#control.store);

        // aceitar/recusar: aceita PATCH (usado pelo front) e POST (compatibilidade)
        this.#router.patch("/:id/aceitar", auth, this.#control.aceitar);
        this.#router.post("/:id/aceitar", auth, this.#control.aceitar);

        this.#router.patch("/:id/recusar", auth, this.#control.recusar);
        this.#router.post("/:id/recusar", auth, this.#control.recusar);

        return this.#router;
    };

};