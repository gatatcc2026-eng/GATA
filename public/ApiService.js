export default class ApiService {

    #token;

    constructor(token = null) {

        this.#token = token;

    }

    async simpleGet(uri) {

        try {

            const response =
                await fetch(uri);

            const jsonObj =
                await response.json();

            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao buscar dados:",
                error.message
            );

            return [];
        }
    }

    async get(uri) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;

            }

            const response =
                await fetch(uri, {
                    method: "GET",
                    headers: headers
                });

            const jsonObj =
                await response.json();
            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao buscar dados:",
                error.message
            );

            return [];
        }
    }

    async getById(uri, id) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;
            }

            const fullUri =
                `${uri}/${id}`;

            const response =
                await fetch(fullUri, {
                    method: "GET",
                    headers: headers
                });

            if (!response.ok) {

                throw new Error(
                    `Erro HTTP: ${response.status}`
                );
            }

            const jsonObj =
                await response.json();


            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao buscar por ID:",
                error.message
            );

            return null;
        }
    }

    async post(uri, jsonObject) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;
            }

            const response =
                await fetch(uri, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(jsonObject)
                });

            const jsonObj =
                await response
                    .json()
                    .catch(() => null);


            if (!response.ok) {

                const erro =
                    new Error(
                        `Erro HTTP: ${response.status}`
                    );

                erro.status =
                    response.status;

                erro.response =
                    jsonObj;

                erro.message =
                    jsonObj?.message ||
                    jsonObj?.msg ||
                    `Erro HTTP: ${response.status}`;

                throw erro;
            }

            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao enviar dados:",
                error
            );

            throw error;
        }
    }

    async put(uri, id, jsonObject) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;
            }

            const fullUri =
                `${uri}/${id}`;

            const response =
                await fetch(fullUri, {
                    method: "PUT",
                    headers: headers,
                    body: JSON.stringify(jsonObject)
                });

            const jsonObj =
                await response
                    .json()
                    .catch(() => null);


            if (!response.ok) {

                const erro =
                    new Error(
                        `Erro HTTP: ${response.status}`
                    );

                erro.status =
                    response.status;

                erro.response =
                    jsonObj;

                erro.message =
                    jsonObj?.message ||
                    jsonObj?.msg ||
                    `Erro HTTP: ${response.status}`;

                throw erro;
            }

            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao enviar dados:",
                error.message
            );

            throw error;
        }
    }

    /**
     * PATCH — recebe a URL já completa (com o id, se houver).
     * Ex.: api.patch(`${API}/5/aceitar`, {})
     */
    async patch(uri, jsonObject = {}) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;
            }

            const response =
                await fetch(uri, {
                    method: "PATCH",
                    headers: headers,
                    body: JSON.stringify(jsonObject)
                });

            const jsonObj =
                await response
                    .json()
                    .catch(() => null);


            if (!response.ok) {

                const erro =
                    new Error(
                        `Erro HTTP: ${response.status}`
                    );

                erro.status =
                    response.status;

                erro.response =
                    jsonObj;

                erro.message =
                    jsonObj?.message ||
                    jsonObj?.msg ||
                    `Erro HTTP: ${response.status}`;

                throw erro;
            }

            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao atualizar dados:",
                error.message
            );

            throw error;
        }
    }

    async delete(uri, id) {

        try {

            const headers = {
                "Content-Type": "application/json"
            };

            if (this.#token) {

                headers["Authorization"] =
                    `Bearer ${this.#token}`;
            }

            const fullUri =
                `${uri}/${id}`;

            const response =
                await fetch(fullUri, {
                    method: "DELETE",
                    headers: headers
                });

            const jsonObj =
                await response
                    .json()
                    .catch(() => null);

            return jsonObj;

        } catch (error) {

            console.error(
                "Erro ao deletar dados:",
                error.message
            );

            return null;
        }
    }

    get token() {

        return this.#token;
    }

    set token(value) {

        this.#token = value;
    }
}