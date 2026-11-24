// Entrega 2 · Integración continua con Jenkins y Docker.
// Construye las dos imágenes de la Entrega 1 (app y storage), ejecuta las pruebas unitarias, levanta
// los servicios con Docker Compose y comprueba que app llega a storage por el nombre del servicio.
// Cualquier fallo marca el build en rojo. El bloque post siempre retira contenedores, red, volumen
// e imágenes del build.
//
// Credencial requerida en Jenkins (Manage Jenkins > Credentials), sin valores en el repositorio:
//   estimador-storage-token  (Secret text): token compartido entre app y storage.

pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    // Integración con GitHub: Jenkins consulta el repositorio cada ~2 minutos y lanza un build
    // cuando hay commits nuevos. Se usa Poll SCM porque Jenkins corre en 127.0.0.1 y GitHub no
    // puede entregarle un webhook. Jenkins registra este disparador tras el primer build.
    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        // Proyecto, red, volumen e imágenes propios de cada build: no tocan la instancia local
        // de la Entrega 1 (estimador-pro-escenario3) ni los builds anteriores.
        COMPOSE_PROJECT_NAME = "estimador-ci-${env.BUILD_NUMBER}"
        COMPOSE_FILE = 'docker-compose.yml:docker-compose.ci.yml'
        IMAGE_TAG = "jenkins-${env.BUILD_NUMBER}"
        LAB_NETWORK = "estimador-ci-${env.BUILD_NUMBER}_lab"
        NODE_IMAGE = 'node:24.22.2-bookworm-slim'
        // Jenkins enmascara el valor en la consola (****).
        STORAGE_API_TOKEN = credentials('estimador-storage-token')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --format="Commit %h · %an · %s"'
            }
        }

        stage('Build') {
            steps {
                sh '''
                    docker version --format 'Docker cliente {{.Client.Version}} · servidor {{.Server.Version}}'
                    docker compose config --services
                    docker compose --progress plain build
                    docker image ls --filter "reference=estimador-pro-*:${IMAGE_TAG}"
                '''
            }
        }

        stage('Test') {
            stages {
                stage('Pruebas unitarias') {
                    steps {
                        // --no-cache-filter: las pruebas corren en cada build aunque el código no
                        // cambie, para que su resultado quede en la consola.
                        sh '''
                            docker build --progress=plain --target unit-test --no-cache-filter unit-test \
                                --secret "id=npm_ca,src=${CORP_CA_FILE}" \
                                -f app/Dockerfile -t "estimador-pro-unit-test:${IMAGE_TAG}" .
                        '''
                    }
                }

                stage('Comunicación entre contenedores') {
                    steps {
                        // --wait falla si app o storage no quedan healthy. El healthcheck de app
                        // ya depende de que storage responda.
                        sh 'docker compose up -d --wait --wait-timeout 120'
                        sh 'docker compose ps'

                        // 1) Desde el contenedor app: resolver el nombre storage y llamar a su API.
                        sh '''
                            docker compose exec -T app node -e "
                              const { lookup } = require('node:dns/promises');
                              (async () => {
                                const { address } = await lookup('storage');
                                console.log('app resuelve storage ->', address);
                                const res = await fetch('http://storage:8081/health', { signal: AbortSignal.timeout(5000) });
                                console.log('app -> http://storage:8081/health ->', res.status, await res.text());
                                if (!res.ok) process.exit(1);
                              })().catch((error) => { console.error('Fallo de comunicación:', error.message); process.exit(1); });
                            "
                        '''

                        // 2) Recorrido completo desde un tercer contenedor en la red lab:
                        //    cliente -> app:8080 -> storage:8081 -> SQLite (POST y GET del mismo respaldo).
                        sh '''
                            docker run --rm -i --network "${LAB_NETWORK}" "${NODE_IMAGE}" \
                                node --input-type=module - http://app:8080 < scripts/verify-docker.mjs
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                if (currentBuild.currentResult != 'SUCCESS') {
                    echo 'Registros de los servicios antes de retirarlos:'
                    sh 'docker compose logs --no-color --tail=200 || true'
                }
            }
            // Limpieza garantizada aunque el build falle o se cancele.
            sh '''
                docker compose down --volumes --remove-orphans --rmi all || true
                docker image rm -f "estimador-pro-unit-test:${IMAGE_TAG}" || true
            '''
            deleteDir()
        }
        success {
            echo "BUILD EXITOSO #${env.BUILD_NUMBER}: imágenes construidas, pruebas unitarias aprobadas y app se comunica con storage por el nombre del servicio."
        }
        failure {
            echo "BUILD FALLIDO #${env.BUILD_NUMBER}: revisa la primera etapa en rojo y los registros de arriba."
        }
        aborted {
            echo "BUILD CANCELADO #${env.BUILD_NUMBER}: los recursos del build ya se retiraron."
        }
    }
}
