const { exigirCoordenador } = require("../middleware/PapelMiddleware");

module.exports = class HistoricoCoordenadorRoteador {

    #router;
    #jwtMiddleware;
    #historicoCoordenadorControl;

    constructor(
        router,
        jwtMiddleware,
        historicoCoordenadorControl
    ) {

        console.log(
            "✅ HistoricoCoordenadorRoteador.constructor()"
        );

        this.#router = router;

        this.#jwtMiddleware =
            jwtMiddleware;

        this.#historicoCoordenadorControl =
            historicoCoordenadorControl;
    }


    createRoutes = () => {

        /* só coordenador lê e grava histórico */
        this.#router.get(
            "/",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#historicoCoordenadorControl.index
        );


        this.#router.post(
            "/",
            this.#jwtMiddleware.validateToken,
            exigirCoordenador,
            this.#historicoCoordenadorControl.store
        );


        return this.#router;
    };
};