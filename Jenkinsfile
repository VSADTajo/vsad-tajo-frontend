pipeline {
    agent any

    environment {
        APP_NAME     = 'vsad-tajo-frontend'
        APP_PORT     = '8080'
        VITE_GEOSERVER_URL='http://65.21.97.113:443/geoserver'
        VITE_API_URL='http://65.21.97.113'
        NODE_VERSION = '22'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BRANCH_NAME_SAFE = env.BRANCH_NAME?.replaceAll('/', '-') ?: 'main'
                    env.IMAGE_TAG = "${env.BRANCH_NAME_SAFE}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run check:lint'
            }
        }

        stage('Type Check') {
            steps {
                sh 'npm run check:types'
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    sh """
                        docker build \
                            --target prod \
                            --build-arg VITE_GEOSERVER_URL=${VITE_GEOSERVER_URL} \
                            --build-arg VITE_API_URL=${VITE_API_URL} \
                            -t ${APP_NAME}:${IMAGE_TAG} \
                            .
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // docker rm is async: it can return "removal already in
                    // progress" while a previous cleanup is still running, and
                    // the immediate `docker run` then fails with "name already
                    // in use". Force-remove and wait until the container is
                    // actually gone before recreating it.
                    sh """
                        docker rm -f ${APP_NAME} 2>/dev/null || true
                        for i in \$(seq 1 30); do
                            docker inspect ${APP_NAME} >/dev/null 2>&1 || break
                            echo "Waiting for ${APP_NAME} to be fully removed..."
                            sleep 1
                        done
                        if docker inspect ${APP_NAME} >/dev/null 2>&1; then
                            echo "Container ${APP_NAME} still present after 30s — aborting deploy" >&2
                            exit 1
                        fi
                        docker run -d \
                            --name ${APP_NAME} \
                            --network infra-network \
                            --restart unless-stopped \
                            -p ${APP_PORT}:80 \
                            ${APP_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully! Deployed ${APP_NAME}:${IMAGE_TAG} on port ${APP_PORT}"
        }
        failure {
            echo 'Pipeline failed. Check the logs above for details.'
        }
        always {
            deleteDir()
        }
    }
}
