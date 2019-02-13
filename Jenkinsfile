pipeline {
  agent {
    label "jenkins-jx-base"
  }
  environment {
    ORG = 'culturagovbr'
    APP_NAME = 'portal-cultura'
    CHARTMUSEUM_CREDS = credentials('jenkins-x-chartmuseum')
  }
  stages {
    stage('Build Release') {
      when {
        branch 'master'
      }
      steps {
        container('jx-base') {

          // ensure we're not on a detached head
          sh "git checkout master"
          sh "git config --global credential.helper store"
          sh "jx step git credentials"

          // so we can retrieve the version in later steps
          sh "echo \$(jx-release-version) > VERSION"
          
          echo "teste"
          
          sh "CI=true DISPLAY=:99"
          sh "export VERSION=`cat VERSION` && skaffold build -f skaffold.yaml"
          sh "cat ./charts/portal-cultura/values.yaml "
          sh "jx step post build --image $DOCKER_REGISTRY/$ORG/$APP_NAME:\$(cat VERSION)"
        }
      }
    }
    stage('Promote to Environments') {
      when {
        branch 'master'
      }
      steps {
        container('jx-base') {
          dir('./charts/portal-cultura') {
            
            // generate tag helm chart
            sh "make tag"

            // release the helm chart
            sh "jx step helm release"

            // promote through all 'Auto' promotion Environments
            sh "jx promote -b --env portal --timeout 1h --version \$(cat ../../VERSION)"
          }
        }
      }
    }
  }
  post {
        always {
          cleanWs()
        }
  }
}
