<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <meta http-equiv='X-UA-Compatible' content='IE=edge' />
    <meta name='ap-local-base-url' content='{{localBaseUrl}}' />
    <title>{{title}}</title>
    <link rel='stylesheet' href='/public/primer/build.css' media='all' />
    <link
      rel='stylesheet'
      href='/public/css/github-configuration.css'
      media='all'
    />
     <link
      rel="stylesheet"
      href="/public/css/global-OLD.css"
      media="all"
    />
    <script src='/public/js/jquery.min.js' nonce='{{nonce}}'></script>
  </head>

  <body class='px-3 py-6'>
    <input type='hidden' id='_csrf' name='_csrf' value='{{csrfToken}}' />
    <input type='hidden' id='jiraHost' name='jiraHost' value='{{jiraHost}}' />
    <input
      type='hidden'
      id='clientKey'
      name='clientKey'
      value='{{clientKey}}'
    />

    <section class="getConfiguration__logout__container">
      <p class="getConfiguration__logout__account">GitHub Account: <span class="getConfiguration__logout__name">{{login}}</span></p>
      <p class="getConfiguration__logout__link logout-link"  target="_blank" >Logout</p>
    </section>

    <section class='getConfiguration'>
      <div class="headerImage">
        <img src='/public/assets/jira-and-github.png' alt="Jira and GitHub logos" />
      </div>

      <h2 class='f2 text-center text-normal getConfiguration__header'>Connect a GitHub organization to your Jira site</h2>
      <p class='jiraInstance'>{{jiraHost}}</p>

        <div class='Box'>
          <div class='getConfiguration__wrapper'>
            <div class='tableHeader'>
              <p class='tableHeader__label org__cell'>Unconnected organizations with Jira app</p>
              <p class='tableHeader__label org__cell'>Repository access</p>
            </div>

            <div class="githubOrgs__table">
              {{#each installations}}
                <div class='githubOrgs__table__row clearfix'>
                  {{!-- Organizations --}}
                  <div class='getConfiguration__orgContent__account org__cell'>
                    <img class='getConfiguration__orgContent__avatar' src='{{account.avatar_url}}' alt='Github organization avatar' />
                    <span class='text-bold text-gray-dark'><a
                        href='{{html_url}}'
                      >{{account.login}}</a></span>
                  </div>

                  {{!-- Repository access --}}
                  <div class='getConfiguration__orgContent org__cell'>
                    <p class="getConfiguration__orgContent__repoSelection">{{repoAccessType repository_selection}}</p>
                    <p class="getConfiguration__orgContent__numberOfRepos">{{numberOfRepos}}</p>
                    {{#if admin}}
                      <a
                        href='/github/subscriptions/{{id}}'
                      >
                        <img class="getConfiguration__orgContent_edit" src='/public/assets/edit-icon.png' alt='Edit' />
                      </a>
                    {{/if}}
                  </div>

                  {{!-- Connect --}}
                  <div class='getConfiguration__orgContent org__cell'>
                    {{#if admin}}
                      {{#if (isNotConnected syncStatus)}}
                        <button
                          class='install-link btn-info getConfiguration__orgContent__connectBtn'
                          data-installation-id='{{id}}'
                          type='submit'
                        >
                          {{connectedStatus syncStatus}}
                        </button>
                      {{else if (inProgressSync syncStatus)}}
                        <div class="getConfiguration__loaderContainer">
                          <div class="getConfiguration__loader"></div>
                        </div>
                      {{else}}
                        <p class="getConfiguration__orgContent__connectedMsg">
                          {{connectedStatus syncStatus}}
                        </p>
                      {{/if}}
                    {{/if}}
                  </div>

                </div>
              {{/each}}

              {{#unless installations}}
                <p class="getConfiguration__noOrganizations">No GitHub organizations with Jira installed.</p>
              {{/unless}}
            </div>
              <a class="getConfiguration__connectNewOrg" href='{{info.html_url}}/installations/new'>
                <span class="getConfiguration__connectNewOrg__plus">+</span> Install Jira on a new organization
              </a>
          </div>
        </div>

    </section>
    <script src='/public/js/github-configuration.js' nonce='{{nonce}}'></script>
  </body>

</html>
