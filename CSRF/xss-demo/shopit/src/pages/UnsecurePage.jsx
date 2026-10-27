import ShopPage from './ShopPage.jsx'

function UnsecurePage() {

  return (
    <ShopPage
      renderReviewComment={(comment, review) => (
        <p
          dangerouslySetInnerHTML={{
            __html: comment,
          }}
        />
      )}
    />
  )
}

export default UnsecurePage