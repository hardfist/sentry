import {Organization} from 'sentry-fixture/organization';

import {getByRole, render, screen, userEvent} from 'sentry-test/reactTestingLibrary';

import {disablePlugin, enablePlugin, fetchPlugins} from 'sentry/actionCreators/plugins';
import type {Organization as TOrganization, Plugin, Project} from 'sentry/types';
import {ProjectPluginsContainer} from 'sentry/views/settings/projectPlugins';

jest.mock('sentry/actionCreators/plugins', () => ({
  fetchPlugins: jest.fn().mockResolvedValue([]),
  enablePlugin: jest.fn(),
  disablePlugin: jest.fn(),
}));

describe('ProjectPluginsContainer', function () {
  let org: TOrganization,
    project: Project,
    plugins: Plugin[],
    params: {projectId: string};

  beforeEach(function () {
    org = Organization();
    project = TestStubs.Project();
    plugins = TestStubs.Plugins([
      {
        enabled: true,
        id: 'disableable plugin',
        name: 'Disableable Plugin',
        slug: 'disableable plugin',
        canDisable: true,
      },
    ]);
    params = {
      projectId: project.slug,
    };

    MockApiClient.addMockResponse({
      url: `/organizations/${org.slug}/`,
      method: 'GET',
      body: org,
    });
    MockApiClient.addMockResponse({
      url: `/organizations/${org.slug}/integrations/`,
      method: 'GET',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: `/projects/${org.slug}/${project.slug}/plugins/`,
      method: 'GET',
      body: plugins,
    });
    MockApiClient.addMockResponse({
      url: `/projects/${org.slug}/${project.slug}/plugins/amazon-sqs/`,
      method: 'POST',
    });
    MockApiClient.addMockResponse({
      url: `/projects/${org.slug}/${project.slug}/plugins/github/`,
      method: 'DELETE',
    });
    render(
      <ProjectPluginsContainer
        {...TestStubs.routeComponentProps()}
        plugins={{plugins, loading: false, error: undefined}}
        params={params}
        organization={org}
        project={project}
      />
    );
  });

  it('calls `fetchPlugins` action creator after mount', function () {
    expect(fetchPlugins).toHaveBeenCalled();
  });

  it('calls `enablePlugin` action creator when enabling plugin', async function () {
    const amazonSQS = await screen.findByText('Amazon SQS');

    const pluginItem = amazonSQS.parentElement?.parentElement?.parentElement;

    if (!pluginItem) {
      return;
    }
    const button = getByRole(pluginItem, 'checkbox');

    expect(enablePlugin).not.toHaveBeenCalled();

    await userEvent.click(button);

    expect(enablePlugin).toHaveBeenCalled();
  });

  it('calls `disablePlugin` action creator when disabling plugin', async function () {
    const disabledPlugin = await screen.findByText('Disableable Plugin');

    const pluginItem = disabledPlugin.parentElement?.parentElement?.parentElement;

    if (!pluginItem) {
      return;
    }

    const button = getByRole(pluginItem, 'checkbox');

    expect(disablePlugin).not.toHaveBeenCalled();

    await userEvent.click(button);

    expect(disablePlugin).toHaveBeenCalled();
  });
});
