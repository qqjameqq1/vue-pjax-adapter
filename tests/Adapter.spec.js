import moxios from 'moxios';
import {createLocalVue, mount} from '@vue/test-utils';
import WrapperComponent from '../src/WrapperComponent.vue';
import Adapter from '../src/Adapter';

const createVm = (options = {}) => {
    let localVue = createLocalVue();

    localVue.component('loaded-component', require('../src/LoadedComponent.vue'));
    localVue.use(Adapter, options);

    return mount(WrapperComponent, {
        attachToDocument: true,
        localVue,
    });
};

describe('Adapter', () => {
    beforeEach(() => {
        resetDom();

        moxios.install();
        moxios.stubRequest('http://example.com/test', {
            status: 200,
            responseText: `
                <div id="loadedComponent">
                    <loaded-component></loaded-component>
                </div>
            `,
        });
        moxios.stubRequest('http://example.com/no-pjax', {
            status: 200,
            responseText: `Loaded without PJAX`,
        });
    });

    afterEach(() => {
        moxios.uninstall();

        window.document.body.innerHTML = '';
        window.history.replaceState({}, '', 'http://example.com/');
    });

    describe('@functionality', () => {
        it('prevents the default on pjax-enabled clicks', (done) => {
            let vm = createVm();
            let spy = sinon.spy();

            vm.find('a.pjax').element.addEventListener('click', spy);
            vm.find('a.pjax').trigger('click');

            moxios.wait(() => {
                expect(spy.calledOnce).toBe(true);
                expect(spy.firstCall.args[0].defaultPrevented).toBe(true);
                expect(moxios.requests.count()).toBe(1);
                expect(vm.find('#page #loadedComponent').text()).toBe('RENDERED CONTENT');
                expect(vm.find('#page loaded-component').element).toBeFalsy();
                expect(vm.find('#page #loadedComponent').element).toBeTruthy();
                done();
            });
        });

        it('renders loaded vue components correctly', (done) => {
            let vm = createVm();

            vm.find('a.pjax').trigger('click');

            moxios.wait(() => {
                expect(moxios.requests.count()).toBe(1);
                expect(vm.find('#page #loadedComponent').text()).toBe('RENDERED CONTENT');
                expect(vm.find('#page loaded-component').element).toBeFalsy();
                expect(vm.find('#page #loadedComponent').element).toBeTruthy();
                done();
            });
        });

        it('manipulates the browser history', (done) => {
            let vm = createVm();
            expect(window.location.href).toBe('http://example.com/');

            vm.find('a.pjax').trigger('click');

            moxios.wait(() => {
                expect(moxios.requests.count()).toBe(1);
                expect(window.location.href).toBe('http://example.com/test');
                done();
            });
        });

        it('has a directive to disable using pjax on certain links', (done) => {
            let vm = createVm();
            let spy = sinon.spy();

            vm.find('a.no-pjax').element.addEventListener('click', spy);
            vm.find('a.no-pjax').trigger('click');

            moxios.wait(() => {
                expect(spy.called).toBe(true);
                expect(spy.firstCall.args[0].defaultPrevented).toBe(false);
                expect(moxios.requests.count()).toBe(0);
                done();
            })
        });
    });

    describe('@options', () => {
        it('the content target selector defaults to #page', (done) => {
            let vm = createVm();
            expect(vm.find('#page').text()).toBe('DEFAULT TARGET');

            vm.find('a.pjax').trigger('click');

            moxios.wait(() => {
                expect(moxios.requests.count()).toBe(1);
                expect(vm.find('#page #loadedComponent').text()).toBe('RENDERED CONTENT');
                done();
            });
        });

        it('the content target selector can be set', (done) => {
            let vm = createVm({targetSelector: '#testTarget'});
            expect(vm.find('#testTarget').text()).toBe('TEST TARGET');

            vm.find('a.pjax').trigger('click');

            moxios.wait(() => {
                expect(moxios.requests.count()).toBe(1);
                expect(vm.find('#testTarget #loadedComponent').text()).toBe('RENDERED CONTENT');
                done();
            });
        });
    });
});
