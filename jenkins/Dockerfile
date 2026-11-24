# Jenkins LTS con el cliente de Docker (CLI, Compose y Buildx) para la Entrega 2.
# El cliente habla con el Docker del host a través del socket montado en docker-compose.yml;
# no se instala un demonio dentro del contenedor.
FROM docker:29.9.3-cli AS docker-cli

FROM jenkins/jenkins:lts-jdk21

USER root

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/

# CA opcional para redes que inspeccionan TLS (antivirus o proxy corporativo).
# Los .crt de jenkins/certs/ no se versionan. Si la carpeta no tiene certificados, este paso no
# cambia nada. /opt/ci/extra-ca.pem siempre existe, aunque quede vacío, porque el Jenkinsfile se
# lo pasa a la compilación de la app como secreto `npm_ca`.
COPY certs/ /usr/local/share/ca-certificates/extra/
RUN set -eu; \
    install -d /opt/ci; \
    : > /opt/ci/extra-ca.pem; \
    for crt in /usr/local/share/ca-certificates/extra/*.crt; do \
      [ -f "$crt" ] || continue; \
      cat "$crt" >> /opt/ci/extra-ca.pem; \
      # "changeit" es la clave pública por defecto del almacén de confianza del JDK, no una credencial.
      keytool -importcert -noprompt -cacerts -storepass changeit \
        -alias "extra-$(basename "$crt" .crt)" -file "$crt"; \
    done; \
    update-ca-certificates; \
    chmod 644 /opt/ci/extra-ca.pem
ENV CORP_CA_FILE=/opt/ci/extra-ca.pem

USER jenkins

COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
